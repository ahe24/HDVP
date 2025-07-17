// ======================================================
// File Name   : top_temp.v
// Author      : SY kim
// Date        : 2025.03.21
// Description :
//   - Top-level module integrating temperature analysis system.
//   - Connects temp_analyzer, fsm_controller, and led_controller.
//   - Manages data flow between submodules.
//
// Tools       : Questasim_2024.3
//
// Inputs:
//   - clk         : System clock signal
//   - reset       : System reset signal
//   - temp_data   : 8-bit temperature input data
//
// Outputs:
//   - green_led   : Green LED state output
//   - red_led     : Red LED state output
//   - system_state: Current system state output (IDLE, NORMAL, WARNING, FAULT)
// ======================================================

module top_temp (
    input wire clk,                // System clock
    input wire reset,              // System reset
    input wire [7:0] temp_data,    // Input temperature data
    output wire norm_led  ,        // Green LED output
    output wire warn_led  ,        // Yellow LED output
    output wire falt_led  ,        // Red LED output
    output wire [1:0] system_state // Temperature analysis system state output
);

    // Internal connection signals
    wire [1:0] temp_state;         // temp_analyzer module output state 

    // Temperature analysis module instantiation
    temp_analyzer u_temp_analyzer (
        .clk(clk),                 // Input: clock
        .temp_data(temp_data),     // Input: temperature data
        .temp_state(temp_state)    // Output: determined state 
    );

    // State machine module instantiation
    fsm_controller u_fsm_controller (
        .clk(clk),                 // Input: clock
        .reset(reset),             // Input: reset
        .temp_state(temp_state),   // Input: determined state
        .system_state(system_state) // Output: system state (connected to external output)
    );

    // LED control module instantiation
    led_controller u_led_controller (
        .clk(clk),                 // Input: clock
        .reset(reset),             // Input: reset
        .system_state(system_state), // Input: system state
        .norm_led  (norm_led ),     // Output: green LED
        .warn_led  (warn_led ),     // Output: green LED
        .falt_led  (falt_led )      // Output: red LED
    );

endmodule
