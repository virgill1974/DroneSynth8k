// Windows test harness for the ASM export: link with the object from "nasm -f win32"; prints the FNV-1a hash of ds_out.
// Default (assemble with DS_NOLOAD, DS_NO_PLAYER, DS_VERIFY): run with the DLS path, the harness fills ds_dls.
// With DS_TEST_SHIPPING (assemble with DS_VERIFY only): the export's own gm.dls loader and waveOut code are used.
#define _CRT_SECURE_NO_WARNINGS
#include <cstdio>
extern "C" void ds_render();
extern "C" unsigned ds_hash();
#ifdef DS_TEST_SHIPPING
extern "C" void ds_play();
extern "C" int ds_pos();
#else
extern "C" unsigned char ds_dls[];
#endif
int main(int argc, char** argv) {
#ifdef DS_TEST_SHIPPING
  if (argc > 99) { ds_play(); printf("%d\n", ds_pos()); } // never runs, but forces the player code to link
#else
  FILE* f = fopen(argv[1], "rb");
  if (!f) { puts("load error"); return 1; }
  fseek(f, 0, SEEK_END);
  long n = ftell(f);
  rewind(f);
  if (fread(ds_dls, 1, n, f) != (size_t)n) { puts("load error"); return 1; }
  fclose(f);
#endif
  ds_render();
  printf("%08x\n", ds_hash());
  return 0;
}
