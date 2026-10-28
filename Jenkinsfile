pipeline {
    agent any

    environment {
        ALERT_EMAIL = 'ozgancan9@gmail.com'
    }

    stages {
        stage('Checkout Source') {
            steps {
                git branch: 'main', url: 'https://github.com/Mahmutcano/energy.git'
            }
        }

        stage('Deploy with Docker Compose') {
            steps {
                echo "YTBS Platform ve PostgreSQL derlenip ayağa kaldırılıyor..."
                sh 'docker compose down || true'
                sh 'docker compose up -d --build'
            }
        }

        stage('Health & Service Verification') {
            steps {
                sh 'docker compose ps'
                echo "YTBS servisi http://localhost:8080 portunda aktif."
            }
        }
    }

    post {
        success {
            echo "YTBS Platformu başarıyla güncellendi ve yayına alındı!"
        }
        failure {
            echo "Deploy başarısız oldu! Lütfen logları inceleyin."
        }
        always {
            cleanWs deleteDirs: true, notFailBuild: true
        }
    }
}
