pipeline { 
    agent none
    stages {
        stage ('Build') {
            agent any
            
            steps {
               sh 'npm install'
               sh 'npm run build'
               sh 'ls -al'
            //    stash includes: 'bin/*', name: 'agents'
            //    withAWS(region: 'us-east-1', credentials: 'katalon-analytics-deploy') {
            //        unstash 'agents'
            //        sh "aws s3 cp target/kit.war s3://elasticbeanstalk-us-east-1-346625874447/${env.BUILD_VERSION}.war;"
            //    }
            }
            
            post {
                always {
                    archiveArtifacts artifacts: 'bin/*', onlyIfSuccessful: true
                }
            }
        }

    }
}
