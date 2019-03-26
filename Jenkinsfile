pipeline { 
    agent none
    stages {

        stage ('Build') {
            agent any
            
            steps {
               sh 'npm install'
               sh 'chmod u+x package.sh && ./package.sh'
            }
            
            post {
                always {
                    archiveArtifacts artifacts: 'bin/*', onlyIfSuccessful: true
                }
            }
        }

    }
}
