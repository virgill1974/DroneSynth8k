// Test harness: compile with -DSONG='"name.h"' and run with the DLS path; prints the FNV-1a hash of ds_out.
// With DS_TEST_SHIPPING (Windows) the export's own gm.dls loader and waveOut code are used, no DLS path needed.
#define _CRT_SECURE_NO_WARNINGS
#define DS_VERIFY
#ifndef DS_TEST_SHIPPING
#define DS_LOAD
#define DS_NO_PLAYER
#endif
#include SONG
#include <cstdio>
#ifndef DS_TEST_SHIPPING
static const char* ds_path;
static void ds_load() { FILE* f = fopen(ds_path, "rb"); if (!f || fread(ds_dls, 1, DS_DLS_SIZE, f) != DS_DLS_SIZE) { puts("load error"); } if (f) fclose(f); }
#endif
int main(int argc, char** argv) {
#ifdef DS_TEST_SHIPPING
  if (argc > 99) { ds_play(); printf("%d\n", ds_pos()); } // never runs, but forces the player code to link
#else
  ds_path = argv[1];
#endif
  ds_render();
  printf("%08x\n", ds_hash());
  return 0;
}
