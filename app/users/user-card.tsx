import { Card, CardContent } from "@/components/ui/card";
import type { Database } from "@/lib/schema";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface UserCardProps {
  profile: Profile;
}

function getInitials(displayName: string | null, email: string): string {
  if (displayName) {
    return displayName
      .split(" ")
      .map((name) => name[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email?.[0]?.toUpperCase() ?? "?";
}

function getRandomColor(userId: string): string {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-yellow-500",
    "bg-red-500",
    "bg-teal-500",
  ];

  // Use userId to consistently generate the same color for each user
  const hash = userId.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

  return colors[Math.abs(hash) % colors.length] ?? "bg-gray-500";
}

export default function UserCard({ profile }: UserCardProps) {
  const initials = getInitials(profile.display_name, profile.email);
  const avatarColor = getRandomColor(profile.id);

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          {/* Avatar Circle */}
          <div
            className={`h-16 w-16 rounded-full ${avatarColor} flex items-center justify-center text-lg font-semibold text-white`}
          >
            {initials}
          </div>

          {/* User Info */}
          <div className="w-full space-y-2">
            <h3 className="text-lg font-semibold leading-tight">{profile.display_name || "No Name"}</h3>

            <p className="break-words text-sm text-gray-600">{profile.email}</p>

            {profile.biography && (
              <p className="line-clamp-3 text-sm leading-relaxed text-gray-700">{profile.biography}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
