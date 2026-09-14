import { defineConfig } from "@antelopejs/interface-core/config";

export default defineConfig({
  name: "interface-file-storage-test",
  cacheFolder: ".antelope/cache",
  modules: {},
  test: { folder: "test" },
});
