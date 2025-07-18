import { configureStore } from "@reduxjs/toolkit";
import projectReducer from "./projectSlice"; // <-- Pfad anpassen

const store = configureStore({
  reducer: {
    project: projectReducer, // <-- wichtig!
  },
});

export default store;