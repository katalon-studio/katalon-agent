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
               withAWS(region: 'us-east-1', credentials: 'katalon-analytics-deploy') {
                   unstash 'agents'
                   sh "aws s3 cp bin/cli-linux-x64 s3://ap-southeast-1/cli-linux-x64;"
                   sh "aws s3 cp bin/cli-linux-x86 s3://ap-southeast-1/cli-linux-x86;"
                   sh "aws s3 cp bin/cli-macos-x64 s3://ap-southeast-1/cli-macos-x64;"
                   sh "aws s3 cp bin/cli-win-x64.exe s3://ap-southeast-1/cli-win-x64.exe;"
                   sh "aws s3 cp bin/cli-win-x86.exe s3://ap-southeast-1/cli-win-x86.exe;"
                   sh "aws s3 cp bin/nssm.exe s3://ap-southeast-1/nssm.exe;"
                   sh "aws s3 cp bin/service.bat s3://ap-southeast-1/service.bat;"
                   sh "aws s3 cp bin/service.sh s3://ap-southeast-1/service.sh;"
               }
            }
            
            post {
                always {
                    archiveArtifacts artifacts: 'bin/*', onlyIfSuccessful: true
                }
            }
        }

    }
}
