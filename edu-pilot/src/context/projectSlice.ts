import { createSlice } from "@reduxjs/toolkit";

const projectSlice = createSlice({
  name: "project",
  initialState: {
    refresh: false,
  },
  reducers: {
    triggerRefresh: (state) => {
      state.refresh = !state.refresh;
    },
  },
});

export const { triggerRefresh } = projectSlice.actions;
export default projectSlice.reducer;
