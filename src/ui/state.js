const VIEW_STORAGE_KEY = "nacha.view";

function storedView() {
  try {
    return localStorage.getItem(VIEW_STORAGE_KEY) === "raw" ? "raw" : "entries";
  } catch {
    return "entries";
  }
}

export const state = {
  file: null,
  fileName: "",
  query: "",
  view: storedView(),
  openEntries: new Set(),
  selectedRecord: null,
};

export function setView(view) {
  state.view = view;
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {}
}
