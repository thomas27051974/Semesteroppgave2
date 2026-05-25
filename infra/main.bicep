// Minimal Bicep for Ageri ATS on Azure.
// Deploy with: az deployment group create -g <rg> --template-file infra/main.bicep
@description('Norway East for data residency.')
param location string = 'norwayeast'
param appName string = 'ageri-ats'
param postgresAdminLogin string
@secure()
param postgresAdminPassword string

var planName = '${appName}-plan'
var siteName = appName
var pgName = '${appName}-pg'
var dbName = 'ats'
var storageName = toLower(replace('${appName}sa', '-', ''))
var acsName = '${appName}-acs'
var pubsubName = '${appName}-pubsub'
var kvName = '${appName}-kv'

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  sku: { name: 'B2', tier: 'Basic' }
  properties: { reserved: true }
}

resource site 'Microsoft.Web/sites@2023-12-01' = {
  name: siteName
  location: location
  properties: {
    serverFarmId: plan.id
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      appSettings: [
        { name: 'NODE_ENV', value: 'production' }
        { name: 'WEBSITES_PORT', value: '3000' }
      ]
    }
  }
  identity: { type: 'SystemAssigned' }
}

resource pg 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: pgName
  location: location
  sku: { name: 'Standard_B1ms', tier: 'Burstable' }
  properties: {
    version: '16'
    administratorLogin: postgresAdminLogin
    administratorLoginPassword: postgresAdminPassword
    storage: { storageSizeGB: 32 }
    backup: { backupRetentionDays: 7, geoRedundantBackup: 'Disabled' }
  }
}

resource pgDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: pg
  name: dbName
}

resource storage 'Microsoft.Storage/storageAccounts@2024-01-01' = {
  name: storageName
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: { allowBlobPublicAccess: false }
}

resource acs 'Microsoft.Communication/communicationServices@2023-06-01-preview' = {
  name: acsName
  location: 'global'
  properties: { dataLocation: 'norway' }
}

resource pubsub 'Microsoft.SignalRService/webPubSub@2024-03-01' = {
  name: pubsubName
  location: location
  sku: { name: 'Standard_S1', tier: 'Standard', capacity: 1 }
}

resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: kvName
  location: location
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
  }
}

output siteHostname string = site.properties.defaultHostName
output postgresHost string = pg.properties.fullyQualifiedDomainName
