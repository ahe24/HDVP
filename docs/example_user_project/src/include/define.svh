`ifndef DEFINE_VH
`define DEFINE_VH

// Temperature range definitions
`define IDLE_MIN    8'hFB   // -5 (IDLE min)
`define IDLE_MAX    8'h05   //  5 (IDLE max)
`define NORMAL_MIN1 8'hCE   // -50 (NORMAL - range min)
`define NORMAL_MAX1 8'hFA   // -6 (NORMAL - range max)
`define NORMAL_MIN2 8'h06   //  6 (NORMAL + range min)
`define NORMAL_MAX2 8'h32   //  50 (NORMAL + range max)
`define WARNING_MIN1 8'h9C  // -100 (WARNING - range min)
`define WARNING_MAX1 8'hCD  // -51 (WARNING - range max)
`define WARNING_MIN2 8'h33  // 51 (WARNING + range min)
`define WARNING_MAX2 8'h64  // 100 (WARNING + range max)

`endif
