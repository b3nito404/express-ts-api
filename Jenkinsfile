pipeline {
    agent any

    environment {
        NODE_VERSION    = '20'
        IMAGE_NAME      = 'express-typescript-api'
        DOCKER_REGISTRY = credentials('docker-registry-url')
        DOCKER_CREDS    = credentials('docker-registry-credentials')
        SONAR_TOKEN     = credentials('sonarqube-token')
        DEPLOY_SSH_KEY  = credentials('deploy-ssh-key')
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
    }

    stages {

        //Stage 1: Checkout
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
                    env.IMAGE_TAG        = "${env.BUILD_NUMBER}-${env.GIT_COMMIT_SHORT}"
                    env.FULL_IMAGE       = "${DOCKER_REGISTRY}/${IMAGE_NAME}:${env.IMAGE_TAG}"
                    echo "Building image: ${env.FULL_IMAGE}"
                }
            }
        }

        //Stage 2: Install Dependencies
        stage('Install') {
            steps {
                sh 'node --version'
                sh 'npm --version'
                sh 'npm ci'
            }
        }

        //Stage 3: Lint
        stage('Lint') {
            steps {
                sh 'npm run lint'
            }
            post {
                failure {
                    echo 'Linting failed — fix ESLint errors before merging.'
                }
            }
        }

        //Stage 4: Build
        stage('Build') {
            steps {
                sh 'npm run build'
                sh 'ls -la dist/'
            }
        }

        //Stage 5: Test
        stage('Test') {
            environment {
                NODE_ENV          = 'test'
                MONGODB_TEST_URI  = 'mongodb://mongo-test:27017/api_test_db'
                JWT_SECRET        = 'ci_test_secret_key'
            }
            steps {
                // Spin up test MongoDB
                sh '''
                    docker run -d --name mongo-test \
                        --network host \
                        mongo:7.0-jammy
                    sleep 5
                '''
                sh 'npm test -- --ci --forceExit'
            }
            post {
                always {
                    // Publish JUnit test results
                    junit allowEmptyResults: true, testResults: 'coverage/junit.xml'

                    // Publish coverage HTML
                    publishHTML(target: [
                        allowMissing         : false,
                        alwaysLinkToLastBuild: true,
                        keepAll              : true,
                        reportDir            : 'coverage',
                        reportFiles          : 'index.html',
                        reportName           : 'Coverage Report',
                    ])

                    // Cleanup test container
                    sh 'docker rm -f mongo-test || true'
                }
                failure {
                    echo 'Tests failed — see test report for details.'
                }
            }
        }

        //Stage 6: Security Audit
        stage('Security Audit') {
            steps {
                sh 'npm audit --audit-level=high'
            }
            post {
                failure {
                    echo 'Security vulnerabilities found — review npm audit output.'
                }
            }
        }

        //Stage 7: Docker Build
        stage('Docker Build') {
            steps {
                script {
                    docker.build(env.FULL_IMAGE, '--target production .')
                    if (env.BRANCH_NAME == 'main') {
                        sh "docker tag ${env.FULL_IMAGE} ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest"
                    }
                }
            }
        }

        //Stage 8: Docker Push
        stage('Docker Push') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            steps {
                script {
                    docker.withRegistry("https://${DOCKER_REGISTRY}", 'docker-registry-credentials') {
                        docker.image(env.FULL_IMAGE).push()
                        if (env.BRANCH_NAME == 'main') {
                            docker.image("${DOCKER_REGISTRY}/${IMAGE_NAME}:latest").push()
                        }
                    }
                }
            }
        }

        //Stage 9: Deploy to Staging
        stage('Deploy Staging') {
            when {
                branch 'develop'
            }
            steps {
                script {
                    sshagent(['deploy-ssh-key']) {
                        sh """
                            ssh -o StrictHostKeyChecking=no deploy@staging.example.com \\
                            "cd /opt/api && \\
                             IMAGE_TAG=${env.IMAGE_TAG} docker-compose -f docker-compose.yml -f docker-compose.prod.yml pull api && \\
                             IMAGE_TAG=${env.IMAGE_TAG} docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d api && \\
                             docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec -T api node dist/server.js --health || true"
                        """
                    }
                }
            }
        }

        //Stage 10 : deploy
        stage('Deploy Production') {
            when {
                branch 'main'
            }
            steps {
                // Manual approval gate
                timeout(time: 15, unit: 'MINUTES') {
                    input message: "Deploy ${env.IMAGE_TAG} to production?",
                          ok: 'Deploy',
                          submitter: 'tech-leads'
                }
                script {
                    sshagent(['deploy-ssh-key']) {
                        sh """
                            ssh -o StrictHostKeyChecking=no deploy@prod.example.com \\
                            "cd /opt/api && \\
                             IMAGE_TAG=${env.IMAGE_TAG} docker-compose -f docker-compose.yml -f docker-compose.prod.yml pull api && \\
                             IMAGE_TAG=${env.IMAGE_TAG} docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps api"
                        """
                    }
                }
            }
        }
    }

    //post actions
    post {
        always {
            // Clean workspace
            cleanWs()
            // Remove dangling images
            sh 'docker image prune -f || true'
        }
        success {
            echo "Pipeline succeeded — build ${env.BUILD_NUMBER} (${env.GIT_COMMIT_SHORT})"
        }
        failure {
            echo "Pipeline FAILED — build ${env.BUILD_NUMBER}"
            emailext(
                subject: "FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: """
                    Build ${env.BUILD_NUMBER} failed on branch ${env.BRANCH_NAME}.
                    Commit: ${env.GIT_COMMIT_SHORT}
                    See: ${env.BUILD_URL}
                """,
                to: '${DEFAULT_RECIPIENTS}'
            )
        }
        unstable {
            echo 'Pipeline unstable — test failures detected.'
        }
    }
}