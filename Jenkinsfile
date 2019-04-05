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
                   sh "aws s3 cp bin/cli-linux-x64 s3://katalon-analytics-local/agents/cli-linux-x64;"
                   sh "aws s3 cp bin/cli-linux-x86 s3://katalon-analytics-local/agents/cli-linux-x86;"
                   sh "aws s3 cp bin/cli-macos-x64 s3://katalon-analytics-local/agents/cli-macos-x64;"
                   sh "aws s3 cp bin/cli-win-x64.exe s3://katalon-analytics-local/agents/cli-win-x64.exe;"
                   sh "aws s3 cp bin/cli-win-x86.exe s3://katalon-analytics-local/agents/cli-win-x86.exe;"
                   sh "aws s3 cp bin/nssm.exe s3://katalon-analytics-local/agents/nssm.exe;"
                   sh "aws s3 cp bin/service.bat s3://katalon-analytics-local/agents/service.bat;"
                   sh "aws s3 cp bin/service.sh s3://katalon-analytics-local/agents/service.sh;"

                   sh "aws s3api put-object-acl --bucket katalon-analytics-local --key agents/cli-linux-x64 --acl public-read"
                   sh "aws s3api put-object-acl --bucket katalon-analytics-local --key agents/cli-linux-x86 --acl public-read"
                   sh "aws s3api put-object-acl --bucket katalon-analytics-local --key agents/cli-macos-x64 --acl public-read"
                   sh "aws s3api put-object-acl --bucket katalon-analytics-local --key agents/cli-win-x64.exe --acl public-read"
                   sh "aws s3api put-object-acl --bucket katalon-analytics-local --key agents/cli-win-x86.exe --acl public-read"
                   sh "aws s3api put-object-acl --bucket katalon-analytics-local --key agents/nssm.exe --acl public-read"
                   sh "aws s3api put-object-acl --bucket katalon-analytics-local --key agents/service.bat --acl public-read"
                   sh "aws s3api put-object-acl --bucket katalon-analytics-local --key agents/service.sh --acl public-read"
               }
            }
        }

    }
}
