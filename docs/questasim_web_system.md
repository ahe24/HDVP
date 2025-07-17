# QuestaSim 웹 인터페이스 시스템 설계문서

## 1. 시스템 개요

### 1.1 목적
- Siemens EDA QuestaSim 시뮬레이터와 Questa Formal(qverify) 분석 툴의 웹 기반 접근성 향상
- 복잡한 명령어 라인 사용 없이 직관적인 웹 인터페이스 제공
- 자동화된 시뮬레이션 실행, Formal 분석 결과 제공

### 1.2 시스템 아키텍처
```
[사용자] → [웹 인터페이스] → [Jenkins] → [QuestaSim / qusta Formal] → [결과 반환]
```

## 2. 웹 인터페이스 (프론트엔드) 상세 설계

### 2.1 주요 기능
- **파일 업로드 관리**
  - 사용자 업로드 폴더 구조 정형화 (./example_user_project 참고)
  - Verilog 소스 파일 및 하위 폴더 업로드 (.v, .sv, 하위 폴더) 
  - 테스트벤치 파일 및 하위 폴더 업로드 (.v, .sv)
  - 다중 파일 업로드 지원
  - 파일 형식 및 크기 검증

- **프로젝트 관리**
  - 프로젝트 생성 및 명명
  - 업로드된 파일 목록 표시
  - 파일 미리보기 기능
  - 프로젝트 삭제 기능

- **시뮬레이션 설정**
  - 시뮬레이션 시간 설정
  - 컴파일 옵션 선택
  - 시뮬레이션 옵션 설정
  - 출력 형식 선택 (waveform(Only VCD format by GTKwave), log 등)
  
- **Questa Formal(qverify) 설정**
  - Structure Lint, CDC, RDC 모드 선택 
  - 분석 대상 설정 (DUT top명 또는 특정 모듈명)
  - 분석 옵션 설정을 위한 tcl 파일 업로드 방식
  - 분석 결과 폴더명 설정 및 분석 결과 파일들(주로 text 기반 로그 파일) 다운로드 지원

- **작업 상태 모니터링**
  - 실시간 작업 진행 상황 표시
  - 큐 대기 상태 표시
  - 진행률 표시기

- **결과 표시**
  - 시뮬레이션 로그 표시
  - 오류 메시지 하이라이팅
  - 결과 파일 다운로드 링크
  - 파형 뷰어 통합 (가능한 경우)

### 2.2 기술 스택
- **프론트엔드**: React.js 또는 Vue.js
- **백엔드**: Node.js (Express) 또는 Python (FastAPI/Django)
- **파일 업로드**: Multer (Node.js) 또는 Python multipart
- **실시간 통신**: WebSocket 또는 Server-Sent Events

### 2.3 주요 컴포넌트(검토 후 변경 가능)
- 분석 후 결정 

## 3. Jenkins 상세 설계

### 3.1 주요 역할
- **작업 큐 관리**
  - 시뮬레이션/Formal 작업 스케줄링
  - 동시 실행 작업 수 제한(License 1 seat, 항상 하나 수행)
  - 우선순위 기반 작업 처리

- **파일 시스템 관리**
  - 업로드된 파일의 지정된 위치로 이동
  - 작업별 독립적인 워크스페이스 생성
  - 작업 완료 후 정리 작업

- **QuestaSim/Formal 실행**
  - 자동화된 컴파일 스크립트 실행 (./example_user_project/run/Makefile 파일 내용 분석하여 참고)
  - 사용자가 업로드한 폴더에서 디자인 소스 및 테스트벤치에 대한 filelist 파일 자동생성 기능 필요성.
  - 시뮬레이션/Formal 실행
  - 결과 파일 수집

- **결과 처리**
  - ./example_user_project/run 폴더 생성물 참고
  - 로그 파일 파싱 
  - 오류 분석 및 분류
  - 결과 파일 아카이빙
  - 웹 인터페이스로 결과 전송

### 3.2 Jenkins 파이프라인 구조 (example)

#### 3.2.1 Stage 1: 환경 준비
```groovy
stage('Environment Setup') {
    steps {
        script {
            // 작업 디렉토리 생성
            def workDir = "workspace_${BUILD_NUMBER}"
            sh "mkdir -p ${workDir}"
            
            // 파일 복사
            sh "cp -r ${UPLOADED_FILES_PATH}/* ${workDir}/"
        }
    }
}
```

#### 3.2.2 Stage 2: QuestaSim 컴파일
```groovy
stage('Compile') {
    steps {
        script {
            sh """
                cd ${workDir}
                vlib work
                vmap work work
                vlog -sv ${VERILOG_FILES}
            """
        }
    }
}
```

#### 3.2.3 Stage 3: 시뮬레이션 실행
```groovy
stage('Simulation') {
    steps {
        script {
            sh """
                cd ${workDir}
                vsim -c -do "run ${SIM_TIME}; quit" ${TESTBENCH_MODULE}
            """
        }
    }
}
```

#### 3.2.4 Stage 4: 결과 수집
```groovy
stage('Collect Results') {
    steps {
        script {
            // 결과 파일 수집
            archiveArtifacts artifacts: '**/*.log, **/*.wlf', fingerprint: true
            
            // 웹 인터페이스로 결과 전송
            sh "curl -X POST ${WEB_API_ENDPOINT}/results -d @results.json"
        }
    }
}
```

### 3.3 Docker 구성

#### 3.3.1 Dockerfile
```dockerfile
FROM jenkins/jenkins:lts

USER root

# QuestaSim 종속성 설치
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    python3-pip \
    curl

# QuestaSim/Questa Formal (Host에 설치되어 있기 때문에 볼륨 마운트로 접근 필요, 설치 위치를 웹 인터페이스 또는 jenkins에 미리 설정)

# Jenkins 플러그인 설치
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

USER jenkins
```

#### 3.3.2 docker-compose.yml
 - 전체 시스템 분석 후 결정

## 4. 시스템 플로우

### 4.1 전체 작업 플로우
1. **사용자 파일 업로드**
   - 웹 인터페이스에서 Verilog 파일과 테스트벤치 업로드
   - 파일 검증 및 임시 저장

2. **Jenkins 작업 트리거**
   - 웹 서버에서 Jenkins API 호출
   - 파라미터와 함께 빌드 실행

3. **작업 큐 처리**
   - Jenkins에서 작업을 큐에 추가
   - 사용 가능한 executor에서 작업 실행

4. **시뮬레이션/formal 실행**
   - 파일을 지정된 워크스페이스로 복사
   - QuestaSim을 사용하여 컴파일 및 시뮬레이션, Formal을 사용하여 분석

5. **결과 처리**
   - 결과 파일 수집 및 처리
   - 웹 인터페이스로 결과 전송

6. **사용자에게 결과 표시**
   - 실시간으로 상태 업데이트
   - 완료 시 결과 파일 제공

### 4.2 API 설계
 - 분석 후 결정


## 5. 보안 고려사항

### 5.1 파일 업로드 보안
- **파일 형식 검증**: 허용된 확장자만 업로드 허용
- **파일 크기 제한**: 최대 업로드 크기 설정
- **샌드박스 실행**: 독립된 환경에서 시뮬레이션 실행

### 5.2 접근 제어
- **사용자 인증**: 로그인 시스템 구현
- **권한 관리**: 역할 기반 접근 제어
- **세션 관리**: 안전한 세션 토큰 사용

### 5.3 시스템 보안
- 외부 인터넷은 사용하지 않는 폐쇄망 서버에 본 시스템 구축
- **네트워크 분리**: Jenkins와 웹 서버 간 내부 네트워크 사용


## 6. 성능 및 확장성

### 6.1 성능 최적화
- 추후 결정


### 6.2 확장성
- **수평 확장**: 여러 Jenkins 에이전트 노드 추가
- 추후 결

## 7. 모니터링 및 로깅

### 7.1 모니터링 항목
- **작업 처리량**: 시간당 처리된 작업 수
- **오류율**: 실패한 작업 비율
- **응답 시간**: 평균 시뮬레이션 완료 시간


## 8. 기술적 고려사항

### 9.1 QuestaSim 라이선스
- **플로팅 라이선스**: 동시 사용자 수 제한 (현재 1명만 교대로 사용 가능)
- **라이선스 관리**: 라이선스 사용 가능 여부 모니터링
- **대기열 관리**: 라이선스 부족 시 대기열 처리

### 9.2 파일 시스템 관리
- **임시 파일**: 정기적인 임시 파일 정리
- **스토리지 용량**: 디스크 사용량 모니터링


