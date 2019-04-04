pipeline { 
    agent none
    stages {
        stage ('Build') {
            agent any
            
            steps {
               sh 'npm install'
               sh 'npm run build'
               sh 'ls -al bin'
               stash includes: 'bin/*', name: 'agents'
            }
            
            post {
                always {
                    archiveArtifacts artifacts: 'bin/*', onlyIfSuccessful: true
                }
            }
        }

        stage ('Upload') {
            when {
                branch 'master'
            }
            agent {
                docker {
                    image 'garland/aws-cli-docker'
                    args '-e AWS_DEFAULT_REGION=us-east-1'
                }
            }
            steps {
                withAWS(region: 'ap-southeast-1', credentials: 'katalon-analytics-deploy') {
                   unstash 'agents'
                   sh 'ls -al bin'
                   sh "aws s3 cp bin/cli-linux-x64 s3://katalon-analytics-local/cli-linux-x64;"
                   sh "aws s3 cp bin/cli-linux-x86 s3://katalon-analytics-local/cli-linux-x86;"
                   sh "aws s3 cp bin/cli-macos-x64 s3://katalon-analytics-local/cli-macos-x64;"
                   sh "aws s3 cp bin/cli-win-x64.exe s3://katalon-analytics-local/cli-win-x64.exe;"
                   sh "aws s3 cp bin/cli-win-x86.exe s3://katalon-analytics-local/cli-win-x86.exe;"
                   sh "aws s3 cp bin/nssm.exe s3://katalon-analytics-local/nssm.exe;"
                   sh "aws s3 cp bin/service.bat s3://katalon-analytics-local/service.bat;"
                   sh "aws s3 cp bin/service.sh s3://katalon-analytics-local/service.sh;"
               }
            }
        }

    }
}
