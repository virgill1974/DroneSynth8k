// Test harness: compile with -DSONG='"name.h"' and run with the DLS path; prints the FNV-1a hash of ds_out.
#define DS_LOAD
#define DS_NO_PLAYER
#define DS_VERIFY
#include SONG
#include <cstdio>
static const char* ds_path;
static void ds_load() { FILE* f = fopen(ds_path, "rb"); if (!f || fread(ds_dls, 1, DS_DLS_SIZE, f) != DS_DLS_SIZE) { puts("load error"); } if (f) fclose(f); }
int main(int argc, char** argv) {
  ds_path = argv[1];
  ds_render();
  printf("%08x\n", ds_hash());
  return 0;
}
