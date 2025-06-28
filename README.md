# PANEL DE CONTROL ADMINISTRATIVO 
  ## ACADEMIA PREUNIVERSITARIA ADIX

  ## DEV - Initial configuration 

    - Clone repository:
      ```
      $ git clone https://github.com/Pre-Adix/backend.git
      ```
    - Install dependencies:
      ```bash
      $ npm install
      ```
    - Create file ".env" copy file ".env.template".

    - Execute Prisma migration:
      ```bash
      $ npx prisma migrate dev
      ```
    - watch mode:
      ```bash
      $ npm run start:dev
      ```

  ## Project setup

  ```bash
  $ npm install
  ```

  ## Compile and run the project

  ```bash
  # development
  $ npm run start

  # watch mode
  $ npm run start:dev

  # production mode
  $ npm run start:prod
  ```

  ## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```