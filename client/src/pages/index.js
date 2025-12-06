import Home from "./home";
import AccessibilityButton from "../components/AccessibilityButton";
import CodexTool from "../components/CodexTool";

export default function Index() {
  return (
    <>
      {/* Home already renders the shared header, avoid double nav */}
      <Home></Home>
      {/*Adds Accessibility Button to page */}
      <AccessibilityButton />
      {/*Adds Chat Option to the current page */}
      <CodexTool />
    </>
  );
}
