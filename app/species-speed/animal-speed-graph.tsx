"use client";

import { max, mean } from "d3-array";
import { axisBottom, axisLeft } from "d3-axis";
import { csv } from "d3-fetch";
import { scaleBand, scaleLinear, scaleOrdinal } from "d3-scale";
import { select } from "d3-selection";
import { useEffect, useRef, useState } from "react";

interface AnimalDatum {
  name: string;
  speed: number;
  diet: "herbivore" | "omnivore" | "carnivore";
}
interface ProcessedData {
  name: string;
  speed: number;
  diet: string;
}

export default function AnimalSpeedGraph() {
  const graphRef = useRef<HTMLDivElement>(null);
  const [animalData, setAnimalData] = useState<AnimalDatum[]>([]);
  const [viewMode, setViewMode] = useState<"categories" | "top-performers">("categories");
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // Table filtering states
  const [nameFilter, setNameFilter] = useState<string>("");
  const [dietFilter, setDietFilter] = useState<string>("");
  const [speedFilter, setSpeedFilter] = useState<string>("");
  const [speedRangeMin, setSpeedRangeMin] = useState<string>("");
  const [speedRangeMax, setSpeedRangeMax] = useState<string>("");

  // Load CSV once
  useEffect(() => {
    csv("/sample_animals.csv")
      .then((rows) => {
        const cleaned: AnimalDatum[] = rows
          .map((d) => ({
            name: (d.name ?? "").toString(),
            speed: Number(d.speed ?? 0),
            diet: (d.diet?.toString().toLowerCase() ?? "") as AnimalDatum["diet"],
          }))
          .filter(
            (d) =>
              d.name &&
              Number.isFinite(d.speed) &&
              d.speed > 0 &&
              ["herbivore", "omnivore", "carnivore"].includes(d.diet),
          );
        setAnimalData(cleaned);
      })
      .catch((e) => console.error("Error loading CSV:", e));
  }, []);

  // Observe container width so we re-draw on resize (prevents "sticky" layout)
  useEffect(() => {
    const el = graphRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(Math.floor(entry.contentRect.width));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!graphRef.current || !containerWidth || animalData.length === 0) return;

    // Clear old SVG
    graphRef.current.innerHTML = "";

    // Process data for current view
    const processed: ProcessedData[] =
      viewMode === "categories"
        ? ((): ProcessedData[] => {
            const herb = animalData.filter((d) => d.diet === "herbivore");
            const omni = animalData.filter((d) => d.diet === "omnivore");
            const carn = animalData.filter((d) => d.diet === "carnivore");
            return [
              { name: "Herbivore", speed: mean(herb, (d) => d.speed) ?? 0, diet: "herbivore" },
              { name: "Omnivore", speed: mean(omni, (d) => d.speed) ?? 0, diet: "omnivore" },
              { name: "Carnivore", speed: mean(carn, (d) => d.speed) ?? 0, diet: "carnivore" },
            ];
          })()
        : ((): ProcessedData[] => {
            const top3 = (diet: AnimalDatum["diet"]) =>
              animalData
                .filter((d) => d.diet === diet)
                .sort((a, b) => b.speed - a.speed)
                .slice(0, 3)
                .map((d) => ({ name: d.name, speed: d.speed, diet: d.diet }));
            return [...top3("herbivore"), ...top3("omnivore"), ...top3("carnivore")];
          })();

    // Responsive sizing
    const isMobile = containerWidth < 640;
    const width = containerWidth;
    const height = isMobile ? (viewMode === "top-performers" ? 520 : 460) : viewMode === "top-performers" ? 520 : 480;

    // Margins: a touch more left on mobile to keep legend + y-axis comfy
    const margin = isMobile
      ? { top: 64, right: 16, bottom: viewMode === "top-performers" ? 130 : 70, left: 48 }
      : { top: 64, right: 120, bottom: viewMode === "top-performers" ? 120 : 80, left: 80 };

    const innerW = Math.max(0, width - margin.left - margin.right);
    const innerH = Math.max(0, height - margin.top - margin.bottom);

    // Build SVG
    const svg = select(graphRef.current).append("svg").attr("width", width).attr("height", height);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Clip so bars never bleed outside the plot
    g.append("clipPath").attr("id", "plot-clip").append("rect").attr("width", innerW).attr("height", innerH);

    // Scales
    const x = scaleBand<string>()
      .domain(processed.map((d) => d.name))
      .range([0, innerW])
      .padding(viewMode === "categories" ? 0.4 : 0.15);

    const y = scaleLinear()
      .domain([0, (max(processed, (d) => d.speed) ?? 100) * 1.05])
      .nice()
      .range([innerH, 0]);

    const color = scaleOrdinal<string>()
      .domain(["herbivore", "omnivore", "carnivore"])
      .range(["#10b981", "#f59e0b", "#ef4444"]);

    // Legend (compact, inside top area) - Fixed for mobile overflow
    const legend = g.append("g").attr("transform", `translate(0, ${-(isMobile ? 28 : 32)})`);
    const legendItems = [
      { key: "herbivore", label: "Herbivore" },
      { key: "omnivore", label: "Omnivore" },
      { key: "carnivore", label: "Carnivore" },
    ];
    const li = legend
      .selectAll(".legend-item")
      .data(legendItems)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (_d, i) => `translate(${i * (isMobile ? 80 : 140)}, 0)`);

    li.append("rect")
      .attr("rx", 2)
      .attr("ry", 2)
      .attr("width", 14)
      .attr("height", 14)
      .attr("fill", (d) => color(d.key)!);

    li.append("text")
      .attr("x", 20)
      .attr("y", 11)
      .attr("font-size", isMobile ? "11px" : "12px")
      .attr("fill", "#374151")
      .text((d) => d.label);

    // Bars
    g.append("g")
      .attr("clip-path", "url(#plot-clip)")
      .selectAll("rect.bar")
      .data(processed)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => x(d.name) ?? 0)
      .attr("y", (d) => y(d.speed))
      .attr("width", x.bandwidth())
      .attr("height", (d) => innerH - y(d.speed))
      .attr("fill", (d) => color(d.diet)!)
      .attr("stroke", "#1f2937")
      .attr("stroke-width", 1);

    // Numeric labels on top of bars (no units)
    g.append("g")
      .attr("clip-path", "url(#plot-clip)")
      .selectAll("text.value")
      .data(processed)
      .enter()
      .append("text")
      .attr("class", "value")
      .attr("x", (d) => (x(d.name) ?? 0) + x.bandwidth() / 2)
      .attr("y", (d) => y(d.speed) - 6)
      .attr("text-anchor", "middle")
      .attr("font-size", isMobile ? "12px" : "12px")
      .attr("fill", "#111827")
      .text((d) => d.speed.toFixed(0));

    // Axes
    const xAxis = axisBottom(x)
      .tickPadding(isMobile ? 10 : 8)
      .tickSizeOuter(0);
    const xAxisG = g.append("g").attr("transform", `translate(0,${innerH})`).call(xAxis);

    // Rotate only for top performers, space labels further from axis
    xAxisG
      .selectAll("text")
      .attr("transform", viewMode === "top-performers" ? "rotate(-35)" : "rotate(0)")
      .style("text-anchor", viewMode === "top-performers" ? "end" : "middle")
      .attr("dy", viewMode === "top-performers" ? "0.9em" : "1.25em");

    const yAxis = axisLeft(y).tickSizeOuter(0);
    g.append("g").call(yAxis).selectAll("text").attr("font-size", "12px").attr("fill", "#374151");

    // Axis labels
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -(isMobile ? 38 : 52))
      .attr("x", -innerH / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .attr("fill", "#374151")
      .text(viewMode === "categories" ? "Average Speed" : "Speed");

    g.append("text")
      .attr("y", innerH + (isMobile ? (viewMode === "top-performers" ? 64 : 44) : 54))
      .attr("x", innerW / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .attr("fill", "#374151")
      .text(viewMode === "categories" ? "Diet Category" : "Animal");
  }, [animalData, viewMode, containerWidth]);

  // Filter the data based on search criteria
  const filteredData = animalData.filter((animal) => {
    const nameMatch = animal.name.toLowerCase().includes(nameFilter.toLowerCase());
    const dietMatch = dietFilter === "" || animal.diet === dietFilter;

    let speedMatch = true;
    if (speedFilter) {
      speedMatch = animal.speed.toString() === speedFilter;
    } else if (speedRangeMin || speedRangeMax) {
      const min = speedRangeMin ? parseFloat(speedRangeMin) : -Infinity;
      const max = speedRangeMax ? parseFloat(speedRangeMax) : Infinity;
      speedMatch = animal.speed >= min && animal.speed <= max;
    }

    return nameMatch && dietMatch && speedMatch;
  });

  const resetFilters = () => {
    setNameFilter("");
    setDietFilter("");
    setSpeedFilter("");
    setSpeedRangeMin("");
    setSpeedRangeMax("");
  };

  return (
    <div className="w-full">
      {/* Toggle */}
      <div className="mb-6 flex justify-center gap-4">
        <button
          onClick={() => setViewMode("categories")}
          className={`rounded-lg px-4 py-2 font-medium transition-colors ${
            viewMode === "categories"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          Diet Categories
        </button>
        <button
          onClick={() => setViewMode("top-performers")}
          className={`rounded-lg px-4 py-2 font-medium transition-colors ${
            viewMode === "top-performers"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          Top Performers
        </button>
      </div>

      {/* Title */}
      <div className="mb-4 text-center">
        <h2 className="text-xl font-semibold text-foreground">
          {viewMode === "categories" ? "Average Speed by Diet Category" : "Top 3 Fastest Animals per Diet Category"}
        </h2>
      </div>

      {/* Chart container — full-bleed on mobile, normal on >=sm */}
      <div
        ref={graphRef}
        className="-mx-4 max-w-[100vw] overflow-x-hidden rounded-lg border border-border bg-background p-2 sm:mx-0 sm:p-4"
        style={{ minHeight: "420px" }}
      />

      {/* Data Table Section */}
      <div className="mt-8">
        <h3 className="mb-4 text-lg font-semibold text-foreground">
          Animal Speed Data ({filteredData.length} of {animalData.length} animals)
        </h3>

        {/* Filters */}
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Name Search */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Search by Name</label>
            <input
              type="text"
              placeholder="Enter animal name..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Diet Filter */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Filter by Diet</label>
            <select
              value={dietFilter}
              onChange={(e) => setDietFilter(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
            >
              <option value="">All Diets</option>
              <option value="herbivore">Herbivore</option>
              <option value="omnivore">Omnivore</option>
              <option value="carnivore">Carnivore</option>
            </select>
          </div>

          {/* Exact Speed */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Exact Speed</label>
            <input
              type="number"
              placeholder="Enter exact speed..."
              value={speedFilter}
              onChange={(e) => setSpeedFilter(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Speed Range */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Speed Range</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={speedRangeMin}
                onChange={(e) => setSpeedRangeMin(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              />
              <input
                type="number"
                placeholder="Max"
                value={speedRangeMax}
                onChange={(e) => setSpeedRangeMax(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>

        {/* Reset Button */}
        <div className="mb-4">
          <button
            onClick={resetFilters}
            className="rounded-md bg-secondary px-4 py-2 text-secondary-foreground transition-colors hover:bg-secondary/80"
          >
            Reset Filters
          </button>
        </div>

        {/* Table - Mobile optimized */}
        <div className="-mx-4 overflow-x-auto rounded-lg border border-border sm:mx-0">
          <table className="w-full min-w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-2 py-3 text-left text-sm font-medium text-foreground sm:px-4">Animal Name</th>
                <th className="px-1 py-3 text-left text-sm font-medium text-foreground sm:px-4">Speed</th>
                <th className="px-2 py-3 text-left text-sm font-medium text-foreground sm:px-4">Diet Category</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData
                  .sort((a, b) => b.speed - a.speed) // Sort by speed descending
                  .map((animal, index) => (
                    <tr key={index} className="border-t border-border hover:bg-muted/50">
                      <td className="px-2 py-3 text-sm text-foreground sm:px-4">{animal.name}</td>
                      <td className="px-1 py-3 text-sm text-foreground sm:px-4">
                        {parseFloat(animal.speed.toString()).toLocaleString("en-US", { maximumFractionDigits: 3 })}
                      </td>
                      <td className="px-2 py-3 text-sm sm:px-4">
                        <span
                          className={`inline-flex items-center rounded-full px-1 py-1 text-xs font-medium sm:px-2 ${
                            animal.diet === "herbivore"
                              ? "bg-green-100 text-green-800"
                              : animal.diet === "omnivore"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {animal.diet.charAt(0).toUpperCase() + animal.diet.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                    No animals match your search criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
