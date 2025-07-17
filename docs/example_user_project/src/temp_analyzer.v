// ======================================================
// File Name   : temp_analyzer.v
// Author      : SY kim
// Date        : 2025.03.21
// Description :
//   - Analyzes temperature data and determines the current state.
//   - Implements temperature range checking logic.
//   - Outputs temperature state based on input value.
//
// Tools       : Questasim_2024.3
//
// Parameters:
//   - IDLE_MIN, IDLE_MAX    : IDLE state temperature range (-5°C~5°C)
//   - NORMAL_MIN1, NORMAL_MAX1
//   - NORMAL_MIN2, NORMAL_MAX2 : NORMAL state temperature range (-50°C~-6°C or 6°C~50°C)
//   - WARNING_MIN1, WARNING_MAX1
//   - WARNING_MIN2, WARNING_MAX2 : WARNING state temperature range (-100°C~-51°C or 51°C~100°C)
//   - FAULT_MIN, FAULT_MAX  : FAULT state temperature range (other values)
//
// Inputs:
//   - temp_data   : 8-bit signed temperature data
//
// Outputs:
//   - temp_state  : Determined 2-bit state output (IDLE, NORMAL, WARNING, FAULT)
// ======================================================

// <<< FPGA-LLR-001 : Temperature State Determination
`include "define.svh"

module temp_analyzer #(
    // Define temperature ranges as parameters
    parameter signed [7:0] IDLE_MIN    = `IDLE_MIN,
    parameter signed [7:0] IDLE_MAX    = `IDLE_MAX,
    parameter signed [7:0] NORMAL_MIN1 = `NORMAL_MIN1,
    parameter signed [7:0] NORMAL_MAX1 = `NORMAL_MAX1,
    parameter signed [7:0] NORMAL_MIN2 = `NORMAL_MIN2,
    parameter signed [7:0] NORMAL_MAX2 = `NORMAL_MAX2,
    parameter signed [7:0] WARNING_MIN1 = `WARNING_MIN1,
    parameter signed [7:0] WARNING_MAX1 = `WARNING_MAX1,
    parameter signed [7:0] WARNING_MIN2 = `WARNING_MIN2,
    parameter signed [7:0] WARNING_MAX2 = `WARNING_MAX2
) (
    input signed [7:0] temp_data,  // Temperature input (8-bit signed)
    input clk,                     // Clock input
    output reg [1:0] temp_state    // State output (2-bit)
);

    // State definitions
    localparam IDLE    = 2'b00;  // IDLE state
    localparam NORMAL  = 2'b01;  // NORMAL state
    localparam WARNING = 2'b10;  // WARNING state
    localparam FAULT   = 2'b11;  // FAULT state

    reg [1:0] temp_state_next;

    always @(*) begin
        if (temp_data >= IDLE_MIN && temp_data <= IDLE_MAX) begin
            // IDLE: -5°C ~ 5°C
            temp_state_next = IDLE;
        end else if ((temp_data >= NORMAL_MIN1 && temp_data <= NORMAL_MAX1) ||
                     (temp_data >= NORMAL_MIN2 && temp_data <= NORMAL_MAX2)) begin
            // NORMAL: -50°C ~ -6°C, 6°C ~ 50°C
            temp_state_next = NORMAL;
        end else if ((temp_data >= WARNING_MIN1 && temp_data <= WARNING_MAX1) ||
                     (temp_data >= WARNING_MIN2 && temp_data <= WARNING_MAX2)) begin
            // WARNING: -100°C ~ -51°C, 51°C ~ 100°C
            temp_state_next = WARNING;
        end else begin
            // FAULT: other values
            temp_state_next = FAULT;
        end
    end

    always @(posedge clk) begin
        temp_state <= temp_state_next;
    end

endmodule
