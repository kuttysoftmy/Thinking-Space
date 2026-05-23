/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import c from "clsx";
import PhotoViz from "./PhotoViz";
import useStore from "./store";
import Sidebar from "./Sidebar";

import {
  setLayout,
  sendQuery,
  clearQuery,
  setXRayMode,
  toggleSidebar,
} from "./actions";

const searchPresets = [
  'winter', 
  'mathematical concepts', 
  'underwater animals', 
  'circular shapes'
]

export default function App() {
  const layout = useStore.use.layout();
  const isFetching = useStore.use.isFetching();
  const xRayMode = useStore.use.xRayMode();
  const caption = useStore.use.caption();
  const isSidebarOpen = useStore.use.isSidebarOpen();
  const highlightNodes = useStore.use.highlightNodes();
  const [value, setValue] = useState("");
  const [searchPresetIdx, setSearchPresetIdx] = useState(0)
  const inputRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() =>
      setSearchPresetIdx(n => n === searchPresets.length - 1 ? 0 : n + 1)
    , 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <main>
      <Link 
        to="/admin" 
        style={{ position: 'absolute', top: 10, left: 15, zIndex: 9999, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', fontSize: 14 }}
      >
        Admin Panel
      </Link>
      <PhotoViz />
      <Sidebar />
      <footer>
        <div className="caption">
          {caption && (
            <>
              <div />
              {caption}
            </>
          )}
        </div>
        <div className="input">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && value) {
                sendQuery(value);
                inputRef.current.blur();
              }
            }}
            ref={inputRef}
            placeholder={`Search images for… “${searchPresets[searchPresetIdx]}”`}
          />
          <img
            src="https://storage.googleapis.com/experiments-uploads/g2demos/photo-applet/spinner.svg"
            className={c("spinner", { active: isFetching })}
          />
          <button
            onClick={() => {
              clearQuery();
              setValue("");
            }}
            className={c("clearButton", { active: highlightNodes })}
          >
            ×
          </button>
        </div>

        <div className="controls">
          <div></div>
          <div>
            <button
              onClick={() => setLayout("sphere")}
              className={c({ active: layout === "sphere" })}
            >
              sphere
            </button>
            <button
              onClick={() => setLayout("grid")}
              className={c({ active: layout === "grid" })}
            >
              grid
            </button>
          </div>
          <div>
            <label>
              <input
                type="checkbox"
                checked={xRayMode}
                onChange={() => setXRayMode(!xRayMode)}
              />
              x-ray
            </label>
          </div>
        </div>
      </footer>
      <button
        onClick={toggleSidebar}
        className={c("sidebarButton iconButton", { active: isSidebarOpen })}
        aria-label="Toggle photo list"
        title="Toggle photo list"
      >
        <span className="icon">list</span>
      </button>
    </main>
  );
}
