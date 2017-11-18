// Compiled for now at https://mbebenita.github.io/WasmExplorer/

extern "C" {
  void log(char* message);
  void greet();
}

void greet() {
  log("Hi!");
}
