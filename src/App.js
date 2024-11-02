import React from "react";
import { NextUIProvider } from "@nextui-org/react";
import Home from "./components/Home";

const App = () => {
  return (
    <NextUIProvider>
      <div className="App">
        <Home />
      </div>
    </NextUIProvider>
  );
};

export default App;
