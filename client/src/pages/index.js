import Home from "./home";

export default function Index() {
  return (
    <>
      {/* Home already renders the shared header, avoid double nav */}
      <Home></Home>
    </>
  );
}
