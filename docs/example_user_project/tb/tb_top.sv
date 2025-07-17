// ======================================================
// File Name   : top_temp_assertion_tb.sv
// Author      : SY kim
// Date        : 2025.03.21
// Description : Assertion-based testbench for top_temp module
// ======================================================

module tb_top;
    // Test Parameters
    parameter CLK_PERIOD = 10;
    parameter TEST_ID_1 = "TC-HLR-001";
    parameter TEST_ID_2 = "TC-HLR-002";
    parameter TEST_ID_3 = "TC-HLR-003";
    parameter TEST_ID_4 = "TC-HLR-005";
    parameter TEST_ID_5 = "TC-HLR-007";

    // State definitions
    localparam IDLE    = 2'b00;
    localparam NORMAL  = 2'b01;
    localparam WARNING = 2'b10;
    localparam FAULT   = 2'b11;

    // DUT Signals
    logic clk;
    logic reset;
    logic [7:0] temp_data;
    logic norm_led;
    logic warn_led;
    logic falt_led;
    logic test_done;
    logic [1:0] system_state;
    bit areset;

  assign areset = reset | test_done;

  `define MAX_LOG 5  // 5���� �׽�Ʈ 
    // Coverage monitoring
    string cov_mon[`MAX_LOG][3];
    int pass_count[`MAX_LOG];
    int fail_count[`MAX_LOG];

    // Expected next state for transitions
    logic [1:0] expected_next_state;

    // DUT Instantiation
    top_temp u_top_temp (
        .clk(clk),
        .reset(reset),
        .temp_data(temp_data),
        .norm_led(norm_led),
        .warn_led(warn_led),
        .falt_led(falt_led),
        .system_state(system_state)
    );

    // Clock Generation
    initial begin
        clk = 0;
        forever #(CLK_PERIOD/2) clk = ~clk;
    end

    // ===== Assertions =====

    // <<< TC-HLR-001 Test : All State Transitions Possible
    property all_states_reachable;
        @(posedge clk) disable iff (areset)
        (temp_data inside {[8'h00:8'h05]}) |-> ##[1:5] (system_state == IDLE);
    endproperty

    tp_HLR_001 : assert property(all_states_reachable)
        begin
            cov_mon[0][1] = $sformatf("%0d", ++pass_count[0]);
            $display("%t\t [%s] => PASS : all_states_reachable", $time, TEST_ID_1);
        end else begin
            cov_mon[0][2] = $sformatf("%0d", ++fail_count[0]);
            $display("%t\t [%s] => FAIL : all_states_reachable", $time, TEST_ID_1);
        end

    // <<< TC-HLR-002 Test : FSM State Transition Stability
    property fsm_transition_stable;
        @(posedge clk) disable iff (areset)
        $stable(system_state) |=> (system_state == expected_next_state);
        //$changed(temp_data) |-> ##2 (system_state == expected_next_state);
    endproperty

    tp_HLR_002 : assert property(fsm_transition_stable)
        begin
            cov_mon[1][1] = $sformatf("%0d", ++pass_count[1]);
            $display("%t\t [%s] => PASS : fsm_transition_stable", $time, TEST_ID_2);
        end else begin
            cov_mon[1][2] = $sformatf("%0d", ++fail_count[1]);
            $display("%t\t [%s] => FAIL : fsm_transition_stable", $time, TEST_ID_2);
        end

    // <<< TC-HLR-003 Test : LED Output Verification
    property led_state_valid;
        @(posedge clk) disable iff (areset)
        $changed(system_state) |=> 
        ((system_state == IDLE)    && (!norm_led && !warn_led && !falt_led)) or
        ((system_state == NORMAL)  && (norm_led && !warn_led && !falt_led)) or
        ((system_state == WARNING) && (!norm_led && warn_led && !falt_led)) or
        ((system_state == FAULT)   && (!norm_led && !warn_led && falt_led));
    endproperty

    tp_HLR_003 : assert property(led_state_valid)
        begin
            cov_mon[2][1] = $sformatf("%0d", ++pass_count[2]);
            $display("%t\t [%s] => PASS : led_state_valid", $time, TEST_ID_3);
        end else begin
            cov_mon[2][2] = $sformatf("%0d", ++fail_count[2]);
            $display("%t\t [%s] => FAIL : led_state_valid", $time, TEST_ID_3);
        end

    // <<< TC-HLR-005 Test : Reset Operation
    property reset_behavior;
        @(posedge clk)
        $rose(reset) |-> ##1 (system_state == IDLE);
    endproperty

    // tp_HLR_005 : assert property(reset_behavior)
    //     begin
    //         cov_mon[3][1] = $sformatf("%0d", ++pass_count[3]);
    //         $display("%t\t [%s] => PASS : reset_behavior", $time, TEST_ID_4);
    //     end else begin
    //         cov_mon[3][2] = $sformatf("%0d", ++fail_count[3]);
    //         $display("%t\t [%s] => FAIL : reset_behavior", $time, TEST_ID_4);
    //     end

    // <<< TC-HLR-007 Test : FSM State Transition Rules from IDLE
    property idle_state_rules;
        @(posedge clk) disable iff (areset)
        (system_state == IDLE) |-> ##1 (system_state == IDLE || system_state == NORMAL);
    endproperty

    tp_HLR_007 : assert property(idle_state_rules)
        begin
            cov_mon[4][1] = $sformatf("%0d", ++pass_count[4]);
            $display("%t\t [%s] => PASS : idle_state_rules", $time, TEST_ID_5);
        end else begin
            cov_mon[4][2] = $sformatf("%0d", ++fail_count[4]);
            $display("%t\t [%s] => FAIL : idle_state_rules", $time, TEST_ID_5);
        end

  // Test stimulus
  initial begin
    // Initialize IDs from assertion labels
    cov_mon[0][0] =  TEST_ID_1 ;  
    cov_mon[1][0] =  TEST_ID_2 ;  
    cov_mon[2][0] =  TEST_ID_3 ;  
    cov_mon[3][0] =  TEST_ID_4 ;  
    cov_mon[4][0] =  TEST_ID_5 ;  
  end
    // Test Stimulus
    initial begin
        // Initialize signals
        test_done = 0;
        reset = 1;
        temp_data = 8'h00;
        expected_next_state = IDLE;
    // Initialize cov_mon array and counters
    for (int i = 0; i < `MAX_LOG; i++) begin
      cov_mon[i][1] = "0";  // Pass count
      cov_mon[i][2] = "0";  // Fail count
      pass_count[i] = 0;    // Initialize pass counter
      fail_count[i] = 0;    // Initialize fail counter
    end        

        // Wait for 5 clock cycles and release reset
        repeat(5) @(posedge clk);
        reset = 0;

        // Test sequence for all states
        // IDLE state test (-5��C)
        set_temperature(-5);
        expected_next_state = IDLE;
        repeat(5) @(posedge clk);

        // NORMAL state test (30��C)
        set_temperature(30);
        expected_next_state = NORMAL;
        repeat(5) @(posedge clk);

        // WARNING state test (90��C)
        set_temperature(90);
        expected_next_state = WARNING;
        repeat(5) @(posedge clk);

        // FAULT state test (-101��C)
        set_temperature(-101);
        expected_next_state = FAULT;
        repeat(5) @(posedge clk);

        // Test reset during operation
        reset = 1;@(posedge clk);
        $display(" ====================================================================== ");
        $display("%t\t Test reset during operation", $time);
        $display(" ---------------------------------------------------------------------- ");        
        expected_next_state = IDLE;
        repeat(5) @(posedge clk);
        reset = 0;

      repeat(5) @(posedge clk);
       
        // End simulation
        test_done = 1;
    $display(" =========================================== ");
    $display(" test_done = %d", test_done);
    $display(" =========================================== ");
 
    end

    // �µ� ���� task
    task set_temperature;
        input int temp_celsius;
        begin
            temp_data = temp_celsius;
            $display(" ====================================================================== ");
            $display("%t\t Setting temperature to %d degC (0x%h)", $time, temp_celsius, temp_data);
            $display(" ---------------------------------------------------------------------- ");
            @(posedge clk);
        end
    endtask

  initial begin
    wait(test_done); 

    print_cov(); // print the final assertion record.

    $display("End of Test..");
    #100
    $stop;
  end


  task print_cov;
    int k;

    k=0;
    $display(" =========================================== ");
    $display(" Functional Verification Results ");
    $display(" =========================================== ");
    while (k < (`MAX_LOG)) begin
      if (cov_mon[k][1] != "0" && cov_mon[k][2] == "0")
        $display(" <<< %s PASS (Pass: %s)", cov_mon[k][0], cov_mon[k][1]);
      else if (cov_mon[k][2] != "0")
        $display(" <<< %s FAIL (Pass: %s, Fail: %s)", cov_mon[k][0], cov_mon[k][1], cov_mon[k][2]);
      else
        $display(" <<< %s Not Tested", cov_mon[k][0]);
      k++;
    end
    $display(" =========================================== ");
  endtask
endmodule
