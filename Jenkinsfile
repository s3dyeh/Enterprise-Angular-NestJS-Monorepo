pipeline {
  agent { label 'enterprise-linux-node24' }
  options {
    timestamps()
    timeout(time: 45, unit: 'MINUTES')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '10'))
    skipDefaultCheckout(true)
  }
  parameters {
    booleanParam(name: 'PUBLISH_IMAGES', defaultValue: false, description: 'Publish scanned images on the protected main branch.')
    booleanParam(name: 'DEPLOY_PRODUCTION', defaultValue: false, description: 'Render a release for review, then request production approval.')
  }
  environment {
    CI = 'true'
    // Configure these nonsecret values as Jenkins folder environment properties.
    // REGISTRY_HOST, REGISTRY_NAMESPACE, PRODUCTION_URL
    DOCKER_BUILDKIT = '1'
  }
  stages {
    stage('Checkout') {
      steps {
        deleteDir()
        checkout scm
        script { env.RELEASE_SHA = sh(script: 'git rev-parse HEAD', returnStdout: true).trim() }
        sh 'node tools/ci-preflight.mjs'
      }
    }
    stage('Install') { steps { sh 'npm run bootstrap' } }
    stage('Quality gates') {
      parallel {
        stage('API') {
          steps { dir('apps/api') { sh 'npm run format:check && npm run lint && npm run typecheck && npm run test:ci && npm run build && npm audit --omit=dev --audit-level=high' } }
        }
        stage('Web') {
          steps { dir('apps/web') { sh 'npm run check && npm audit --omit=dev --audit-level=high' } }
        }
      }
    }
    stage('Integration and browser') {
      steps { sh 'node tools/ci-integration.mjs' }
    }
    stage('Images and manifests') {
      steps {
        sh '''
          set -eu
          mkdir -p .artifacts
          docker build --pull -f apps/api/Dockerfile -t enterprise-api:$RELEASE_SHA .
          docker build --pull -f apps/web/Dockerfile -t enterprise-web:$RELEASE_SHA .
          API_IMAGE=enterprise-api:$RELEASE_SHA node tools/redis-cluster-smoke.mjs
          trivy image --exit-code 1 --severity HIGH,CRITICAL enterprise-api:$RELEASE_SHA
          trivy image --exit-code 1 --severity HIGH,CRITICAL enterprise-web:$RELEASE_SHA
          trivy image --format cyclonedx --output .artifacts/api.sbom.json enterprise-api:$RELEASE_SHA
          trivy image --format cyclonedx --output .artifacts/web.sbom.json enterprise-web:$RELEASE_SHA
          kubectl kustomize deploy/kubernetes/overlays/production > .artifacts/production.yaml
          kubeconform -strict -summary .artifacts/production.yaml deploy/kubernetes/base/migration.yaml
        '''
      }
    }
    stage('Publish immutable images') {
      when { allOf { branch 'main'; not { changeRequest() }; expression { params.PUBLISH_IMAGES } } }
      steps {
        withCredentials([usernamePassword(credentialsId: 'enterprise-registry', usernameVariable: 'REGISTRY_USER', passwordVariable: 'REGISTRY_PASSWORD')]) {
          sh '''
            set +x
            set -eu
            : "${REGISTRY_HOST:?Set REGISTRY_HOST}" "${REGISTRY_NAMESPACE:?Set REGISTRY_NAMESPACE}"
            export DOCKER_CONFIG="$(mktemp -d)"
            trap 'rm -rf "$DOCKER_CONFIG"' EXIT
            printf '%s' "$REGISTRY_PASSWORD" | docker login "$REGISTRY_HOST" --username "$REGISTRY_USER" --password-stdin
            for app in api web; do
              image="$REGISTRY_HOST/$REGISTRY_NAMESPACE/$app:$RELEASE_SHA"
              docker tag "enterprise-$app:$RELEASE_SHA" "$image"
              docker push "$image"
              docker inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "$image" | awk -v repo="$REGISTRY_HOST/$REGISTRY_NAMESPACE/$app@" 'index($0,repo)==1 {print;exit}' > ".artifacts/$app.image"
              test -s ".artifacts/$app.image"
            done
          '''
        }
      }
    }
    stage('Review production release') {
      when { allOf { branch 'main'; not { changeRequest() }; expression { params.DEPLOY_PRODUCTION && params.PUBLISH_IMAGES } } }
      steps {
        sh 'node tools/render-release.mjs'
        archiveArtifacts artifacts: '.artifacts/*.yaml,.artifacts/*.image,.artifacts/*.json', fingerprint: true
        timeout(time: 15, unit: 'MINUTES') {
          input message: 'Review the archived manifests, image digests, test reports, and migration plan before deploying.', ok: 'Deploy', submitter: 'production-release-managers'
        }
      }
    }
    stage('Deploy production') {
      when { allOf { branch 'main'; not { changeRequest() }; expression { params.DEPLOY_PRODUCTION && params.PUBLISH_IMAGES } } }
      steps {
        lock(resource: 'enterprise-production') {
          withCredentials([file(credentialsId: 'enterprise-production-kubeconfig', variable: 'KUBECONFIG')]) {
            sh '''
              set -eu
              : "${PRODUCTION_URL:?Set PRODUCTION_URL}"
              kubectl apply --dry-run=server -f .artifacts/production.yaml > /dev/null
              kubectl apply -n enterprise-production -f .artifacts/config.yaml
              kubectl create -n enterprise-production -f .artifacts/migration.yaml
              job="enterprise-migration-$(printf '%s' "$RELEASE_SHA" | cut -c1-12)-$BUILD_NUMBER"
              kubectl wait -n enterprise-production --for=condition=complete --timeout=600s "job/$job"
              kubectl apply -f .artifacts/production.yaml
              kubectl rollout status -n enterprise-production deployment/api --timeout=300s
              kubectl rollout status -n enterprise-production deployment/web --timeout=300s
              curl --fail --retry 5 --max-time 15 "$PRODUCTION_URL/health/live"
              curl --fail --retry 5 --max-time 15 "$PRODUCTION_URL/api/v1/auth/browser/config"
            '''
          }
        }
      }
    }
  }
  post {
    always {
      junit allowEmptyResults: true, testResults: 'apps/api/test-results/*.xml,apps/web/test-results/*.xml'
      archiveArtifacts allowEmptyArchive: true, artifacts: '.artifacts/**,apps/web/playwright-report/**', fingerprint: true
    }
    cleanup { deleteDir() }
  }
}

