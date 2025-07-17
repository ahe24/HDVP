// ======================================================
// File Name   : fsm_controller.v
// Author      : SY kim
// Date        : 2025.03.21
// Description :
//   - Implements a Finite State Machine (FSM) controller.
//   - Manages state transitions based on temperature input.
//   - Controls system behavior in different states.
//
// Tools       : Questasim_2024.3
//
// Inputs:
//   - clk         : Clock signal
//   - reset       : Asynchronous reset signal
//   - temp_state  : Temperature state input from temp_analyzer (2-bit)
//
// Outputs:
//   - system_state: System state output determined by state machine (2-bit, IDLE, NORMAL, WARNING, FAULT)
// ======================================================

module fsm_controller (
    input wire clk,                // Clock signal
    input wire reset,              // Reset signal
    input wire [1:0] temp_state,   // Temperature state from analyzer module
    output reg [1:0] system_state  // Final system state output
);

    // State definitions
    localparam IDLE    = 2'b00;
    localparam NORMAL  = 2'b01;
    localparam WARNING = 2'b10;
    localparam FAULT   = 2'b11;

    // Next state
    reg [1:0] next_state;

    always @(posedge clk or posedge reset) begin
        if (reset)
            system_state <= IDLE; // Initialize to IDLE on reset
        else
            system_state <= next_state;
    end	

    // <<< FPGA-LLR-004 : FSM State Determination
    // <<< FPGA-LLR-005 : State Transition Rules
    always @(*) begin
        case (system_state)
            IDLE: begin
            if (temp_state == NORMAL)
                next_state = NORMAL;  // Can transition to NORMAL state
            else if (temp_state == WARNING)
                next_state = WARNING; // Can transition to WARNING state
            else
                next_state = IDLE;    // Maintain IDLE state
        end

        NORMAL: begin
            if (temp_state == IDLE)
                next_state = IDLE;    // Can transition to IDLE state
            else if (temp_state == WARNING)
                next_state = WARNING; // Can transition to WARNING state
            else if (temp_state == FAULT)
                next_state = FAULT;   // Can transition to FAULT state	
            else
                next_state = NORMAL;  // Maintain NORMAL state
        end

        WARNING: begin
            if (temp_state == IDLE)
                next_state = IDLE;    // Can transition to IDLE state
            else if (temp_state == NORMAL)
                next_state = NORMAL;  // Can transition to NORMAL state
            else if (temp_state == FAULT)
                next_state = FAULT;   // Can transition to FAULT state
            else
                next_state = WARNING; // Maintain WARNING state
        end

        FAULT: begin
            if (temp_state == IDLE)
                next_state = IDLE;    // Can only transition to IDLE state
            else
                next_state = FAULT;   // Cannot transition to other states
        end

        default: next_state = IDLE;   // Default: IDLE state
        endcase
    end

endmodule