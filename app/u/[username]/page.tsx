import PublicProfile from "./PublicProfile";

// Next.js 15+: params is a Promise
export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <PublicProfile username={username} />;
}
