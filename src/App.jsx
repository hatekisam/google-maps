import "./App.css";
import { LoadScript } from "@react-google-maps/api";
import Map from "./components/Map";
import { TailSpin } from "react-loader-spinner";

function App() {
  return (
    <LoadScript
      googleMapsApiKey="AIzaSyAfNiYnPM5UFgy26FsCOUSRrvzdNTrNV5w"
      libraries={["places"]}
      loadingElement={
        <div className="flex items-center justify-center top-56 h-[100vh]">
          <TailSpin color="#0000ff" height={60} />
        </div>
      }
      scriptProps={{
        async: true,
        defer: true,
        onload: () => console.log("API loaded successfully"),
      }}
    >
      <Map />
    </LoadScript>
  );
}

export default App;
