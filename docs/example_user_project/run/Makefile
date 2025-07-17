# run_tcl_example

## QuestaSim

### Compile

TB_NAME = tb_top
DUT_TOP = top_temp

DEFINE_OPTS = +define+SIMULATION  +define+DEPT=10 
INCDIR_OPTS = +incdir+../src +incdir+../src/include

FILELIST  = filelist.f
VLOG_OPTS = -sv $(DEFINE_OPTS) $(INCDIR_OPTS) -f $(FILELIST) -l compile.log
VOPT_OPTS = +acc=npr $(DEFINE_OPTS) -l vopt.log
VSIM_OPTS = $(DEFINE_OPTS) -l vsim.result

compile:
	vlog $(VLOG_OPTS) 


### Optimization
opt:
	vopt $(TB_NAME) -o opt $(VOPT_OPTS)


### Simulation
sim:
	vsim -c opt $(VSIM_OPTS) -do "run -all; quit -f;exit 0"


####======================
all: compile opt sim

## Questa Formal Lint 
LINT_OUT_DIR = Lint_result

lint: compile
	qverify -c -licq -l glint.log -od $(LINT_OUT_DIR) -do "\
      onerror {exit 1}; \
      lint methodology standard -goal do-254; \
      lint run -d $(DUT_TOP); \
      exit 0"


