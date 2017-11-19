// Compiled for now at https://mbebenita.github.io/WasmExplorer/

extern "C" {
  void log(const char* message);
  void greet();
}

void greet() {
  log("Hi!");
}
