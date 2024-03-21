const crypto = require("crypto");
const AWS = require("aws-sdk");

exports.handler = async (event) => {
    try {
        // Obtaining payload from request body
        const requestBody = JSON.parse(event.body);
        const { username, password } = requestBody;

        // Obtaining client_id and client_secret from headers
        const client_id = process.env.CLIENT_ID
        const client_secret = process.env.CLIENT_SECRET

        // Validating input
        if (!username || !password) {
            // Returning validation error
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: "Parâmetros de usuário e/ou senha não encontrados" })
            };
        }

        // Generating secret hash
        const secretHash = crypto.createHmac('SHA256', client_secret)
                                 .update(username + client_id)
                                 .digest('base64');

        // Parameters for authentication request
        const params = {
            AuthFlow: "USER_PASSWORD_AUTH",
            ClientId: client_id,
            AuthParameters: {
                USERNAME: username,
                PASSWORD: password,
                SECRET_HASH: secretHash
            }
        };

        // Initializing Cognito service
        const cognito = new AWS.CognitoIdentityServiceProvider({ region: process.env.AWS_REGION });

        // Initiating authentication
        console.log(`Authenticating user ${username} in cognito`)
        const response = await cognito.initiateAuth(params).promise();

        // Returning authentication token
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token: response.AuthenticationResult.IdToken })
        };

    } catch (error) {
        console.error('Error authenticating user', error);
         // Returning authentication error
        return {
            statusCode: error?.statusCode || 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: error?.message || "Não foi possível autenticar o usuário" })
        };
    }
};
