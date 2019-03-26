pipeline { 
    agent none
    stages {

        stage ('Build') {
            // agent {
            //     docker {
            //         image 'node:10.15.3'
            //         args "-u root"
            //     }
            // }
            agent any
            
            steps {
               sh 'npm install'
               sh 'chmod u+x package.sh && ./package.sh'
               sh 'ls bin'
            }
        }

    }    
}

