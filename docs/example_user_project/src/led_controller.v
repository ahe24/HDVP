// ======================================================
// File Name   : led_controller.v
// Author      : SY kim
// Date        : 2025.03.21
// Description :
//   - Controls LED states based on system state.
//   - Implements different LED patterns for each state.
//   - Provides visual feedback of system status.
//
// Tools       : Questasim_2024.3
//
// Compile-time Option:
//   - `SIMULATION` flag can be enabled to reduce blink speed in simulation environment.
//
// Inputs:
//   - clk         : Clock signal
//   - reset       : Reset signal
//   - system_state: System state input from FSM
//
// Outputs:
//   - green_led   : Green LED state output (ON or OFF)
//   - red_led     : Red LED state output (ON, OFF, or BLINK)
// ======================================================


// <<< FPGA-LLR-009 : LED Operation Control
// <<< FPGA-LLR-011 : LED State on Reset

module led_controller (
    input wire clk,                   // Clock signal
    input wire reset,                 // Reset signal
    input wire [1:0] system_state,    // System state input from state machine
    output reg norm_led,             // Green LED state output (ON or OFF)
    output reg warn_led,             // Green LED state output (ON or OFF)
    output reg falt_led              // Red LED state output (ON, OFF, or BLINK)
);

    // State definitions
    localparam IDLE    = 2'b00;
    localparam NORMAL  = 2'b01;
    localparam WARNING = 2'b10;
    localparam FAULT   = 2'b11;

    // Counter for blink control
    reg blink_flag;           // BLINK state flag

    // LED control logic
    always @(posedge clk or posedge reset) begin
        if (reset) begin
            // Initialize all outputs on reset
            norm_led    <= 1'b0;
            warn_led    <= 1'b0;
            falt_led    <= 1'b0;
        end else begin
            case (system_state)
                IDLE: begin
                    norm_led    <= 1'b0;
                    warn_led    <= 1'b0;
                    falt_led    <= 1'b0;
                end
                
                NORMAL: begin
                    norm_led    <= 1'b1;
                    warn_led    <= 1'b0;
                    falt_led    <= 1'b0;
                end
                
                WARNING: begin
                    norm_led    <= 1'b0;
                    warn_led    <= 1'b1;
                    falt_led    <= 1'b0;
                end
                
                FAULT: begin
                    norm_led    <= 1'b0;
                    warn_led    <= 1'b0;
                    falt_led    <= 1'b1;
                end
                
                default: begin
                    norm_led    <= 1'b0;
                    warn_led    <= 1'b0;
                    falt_led    <= 1'b0;
                end
            endcase
        end
    end

endmodule
