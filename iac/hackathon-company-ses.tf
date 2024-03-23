resource "aws_sesv2_email_identity" "hackathon-company-ses-sender-email-identity" {
  email_identity = "sac.fast.n.foodious@gmail.com"
  configuration_set_name = aws_sesv2_configuration_set.hackathon-company-ses-configuration-set.configuration_set_name
}

resource "aws_sesv2_email_identity" "hackathon-company-ses-client-email-identity" {
  email_identity = "sagikoh315@otemdi.com"
  configuration_set_name = aws_sesv2_configuration_set.hackathon-company-ses-configuration-set.configuration_set_name
}

resource "aws_sesv2_configuration_set" "hackathon-company-ses-configuration-set" {
    configuration_set_name = "hackathon-company-ses-configuration-set"
    sending_options {
      sending_enabled = true
    }
}