#include <iostream>
#include <memory>
#include <string>

int main() {
  auto number = std::make_unique<int>(42);
  std::string greeting = "Hello";
  std::cout << greeting << ": " << *number << std::endl;
}
