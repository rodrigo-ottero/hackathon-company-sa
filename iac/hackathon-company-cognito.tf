resource "aws_cognito_user_pool" "hackathon-company-user-pool" {
    name = "hackathon-company-user-pool"
    auto_verified_attributes  = ["email"]
    mfa_configuration = "OFF"

    account_recovery_setting {
      recovery_mechanism {
        priority = 1
        name = "verified_email"
      }
    }
    password_policy {
        minimum_length    = 6
        require_lowercase = false
        require_numbers   = false
        require_symbols   = false
        require_uppercase = false
    }
    
    schema {
      name                = "matricula"
      attribute_data_type = "String"
      required            = false
      mutable             = true
    }

    schema {
      name                = "roles"
      attribute_data_type = "String"
      required            = false
      mutable             = true
    }

    lifecycle {
      ignore_changes = [
        password_policy,
        schema
      ]
  }
}

resource "aws_cognito_user" "hackathon-func-user" {
  user_pool_id = aws_cognito_user_pool.hackathon-company-user-pool.id
  username     = "mariasilva"
  password = random_password.hackathon-company-random-passoword.result
  enabled = true
  attributes = {
    name  = "Maria da Silva"
    email = "sagikoh315@otemdi.com"
    matricula = "11111"
    roles= "func"
    email_verified = true
  }

  depends_on = [ aws_cognito_user_pool.hackathon-company-user-pool ]
}

resource "aws_cognito_user" "hackathon-admin-user" {
  user_pool_id = aws_cognito_user_pool.hackathon-company-user-pool.id
  username     = "josesilva"
  password = random_password.hackathon-company-random-passoword.result
  enabled = true
  attributes = {
    name  = "Jose da Silva"
    email = "sagikoh315@otemdi.com"
    matricula = "22222"
    roles= "admin"
    email_verified = true
  }

  depends_on = [ aws_cognito_user_pool.hackathon-company-user-pool ]
}

resource "aws_cognito_user_pool_client" "hackathon-company-client" {
  name                                  = "hackathon-company-client"
  user_pool_id                          = aws_cognito_user_pool.hackathon-company-user-pool.id
  allowed_oauth_scopes                  = ["hackathon-company-resource-server/read", "hackathon-company-resource-server/write"]
  allowed_oauth_flows                   = [ "client_credentials"]
  generate_secret                       = true
  explicit_auth_flows                   = ["ALLOW_USER_SRP_AUTH", "ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]
  prevent_user_existence_errors         = "ENABLED"

  access_token_validity                 = 1
  id_token_validity                     = 1
  refresh_token_validity                = 30
  enable_token_revocation               = true
  allowed_oauth_flows_user_pool_client = true
  read_attributes                       = ["email"]
  supported_identity_providers = ["COGNITO"]
  depends_on = [ aws_cognito_resource_server.hackathon-company-resource-server ]
}

resource "aws_cognito_resource_server" "hackathon-company-resource-server" {
  user_pool_id       = aws_cognito_user_pool.hackathon-company-user-pool.id
  identifier         = "hackathon-company-resource-server"
  name               = "hackathon-company-resource-server"
  scope {
    scope_name       = "read"
    scope_description= "Read access"
  }
  scope {
    scope_name       = "write"
    scope_description= "Write access"
  }
}

resource "aws_cognito_user_pool_domain" "hackathon-company-domain" {
  domain        = "hackathon-company-${random_integer.machine-id.result}"
  user_pool_id  = aws_cognito_user_pool.hackathon-company-user-pool.id
}

resource "null_resource" "update_lambda_environment" {
  triggers = {
    always_run = "${timestamp()}"
  }

  depends_on = [aws_cognito_user_pool_domain.hackathon-company-domain]

  provisioner "local-exec" {
    command = <<EOT
      aws lambda update-function-configuration --function-name ${aws_lambda_function.hackathon-company-lambda-authorizer.function_name} --region us-east-1 \
      --environment "Variables={CLIENT_ID=${aws_cognito_user_pool_client.hackathon-company-client.id},CLIENT_SECRET=${aws_cognito_user_pool_client.hackathon-company-client.client_secret}}"
    EOT
  }
}

resource "random_uuid" "number" {
}
resource "random_integer" "machine-id" {
  min = 0
  max = 10
}