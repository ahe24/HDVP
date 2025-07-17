configure license queue on
onerror {exit 1}
lint methodology standard -goal do-254
lint run -d top_temp
configure environment QLC_DEF_GOAL /opt/QOSF_2024.3/questa_static_formal/linux_x86_64/share/methodology/lint/soc/start.goal
