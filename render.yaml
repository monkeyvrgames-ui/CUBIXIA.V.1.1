services:
  - type: web
    name: cubixia-world
    env: node
    plan: free
    buildCommand: npm ci --omit=dev
    startCommand: npm run start:render
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: CUBIXIA_DATA_DIR
        value: /var/data/cubixia
      - key: SESSION_SECRET
        generateValue: true
      - key: GMAIL_USER
        sync: false
      - key: GMAIL_APP_PASSWORD
        sync: false
    disk:
      name: cubixia-data
      mountPath: /var/data
      sizeGB: 1
