// Example CI pipeline for NeonFlare: build the static-site image, push it
// to a container registry, and (re)deploy it as a plain `docker run` on
// the build node. Adapt the values in `environment` to your setup.
//
// Assumes an agent whose `docker` container can reach a Docker daemon
// (e.g. a mounted /var/run/docker.sock). If that daemon isn't already
// authenticated to your registry, uncomment the `docker login` step
// below and point REGISTRY_CREDENTIALS at a Jenkins username/password
// credential.
pipeline {
  agent { label 'docker' }

  environment {
    // e.g. "registry.example.com", "ghcr.io", "docker.io/youruser"
    REGISTRY             = 'registry.example.com'
    IMAGE_NAME           = 'neonflare'
    // Jenkins credentials ID (username/password) for the registry.
    // Only needed if the build node isn't already logged in.
    REGISTRY_CREDENTIALS = 'registry-credentials'

    IMAGE        = "${REGISTRY}/${IMAGE_NAME}:${env.GIT_COMMIT?.take(7) ?: 'latest'}"
    IMAGE_LATEST = "${REGISTRY}/${IMAGE_NAME}:latest"

    // Running container name + host port to expose it on.
    DEPLOY_NAME = 'neonflare'
    HOST_PORT   = '8080'
  }

  stages {
    stage('CSP lint') {
      // PlanDurcissement-Securite.txt P1.4 -- fails the build if a bare
      // <script> (no src) or an on[a-z]+="" handler reappears in a
      // delivered .html page, so the site can't silently drift off
      // script-src 'self' again. Runs in its own throwaway python
      // container rather than assuming python3 is on the docker image
      // this pipeline otherwise only uses for build/push/deploy.
      steps {
        container('docker') {
          sh 'docker run --rm -v "$WORKSPACE":/repo -w /repo python:3-alpine python3 scripts/check-csp-inline.py'
        }
      }
    }

    stage('Build image') {
      steps {
        container('docker') {
          sh 'docker build -t "$IMAGE" -t "$IMAGE_LATEST" .'
        }
      }
    }

    stage('Push image') {
      steps {
        container('docker') {
          // Uncomment if the daemon isn't already authenticated:
          // withCredentials([usernamePassword(credentialsId: env.REGISTRY_CREDENTIALS,
          //     usernameVariable: 'REG_USER', passwordVariable: 'REG_PASS')]) {
          //   sh 'echo "$REG_PASS" | docker login "$REGISTRY" -u "$REG_USER" --password-stdin'
          // }
          sh 'docker push "$IMAGE"'
          sh 'docker push "$IMAGE_LATEST"'
        }
      }
    }

    stage('Deploy') {
      steps {
        container('docker') {
          sh '''
            docker rm -f "$DEPLOY_NAME" || true
            docker run -d --name "$DEPLOY_NAME" --restart unless-stopped \
              -p "$HOST_PORT":80 "$IMAGE_LATEST"
          '''
        }
      }
    }
  }
}
