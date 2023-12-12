# sample ffmpeg docker

This project is a Node.js server application that uses the Replicate and AWS SDKs to perform various operations related to audio processing and transcription.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js
- npm
- An AWS account with S3 access
- A Replicate API token
- Docker installed on your machine

### Installing

1. Clone the repository
2. Install the dependencies with `npm install`
3. Create a `.env` file in the root directory and add the following environment variables:
    - `SENTRY_DNS`
    - `REPLICATE_API_TOKEN`
    - `PORT`
    - `OPENAI_WHISPER_MODEL`
    - `TORTOISE_MODEL`
    - `TORTOISE_PRESET`
    - `OPENAI_WHISPER_LANGUAGE`
    - `AWS_BUCKET`

## Using Docker

### Building the Docker Image

In the project root directory, run the following command to build the Docker image:

```bash
docker build -t your-image-name .
``````

Replace your-image-name with the name you want to give to your Docker image.

Running the Docker Image
After the image has been built, you can run it with the following command:

```bash
docker run -p 8080:8080 your-image-name
```

Replace 8080:8080 with the port mapping appropriate for your application. The format is hostPort:containerPort. Also, replace your-image-name with the name of your Docker image.

Now, your application should be running inside a Docker container.

API Endpoints

- GET /: Returns a "Hello World" message.
- POST /transcribe: Transcribes an audio file using the OpenAI Whisper model.
- POST /coach-voice: Generates a custom voice using the Tortoise model.
- POST /prepare: Prepares and processes user audio files stored in an AWS S3 bucket.

Built With
- Express - The web framework used
- AWS SDK - AWS SDK for JavaScript in Node.js
- Replicate - Used to run machine learning models

## Contributing
Please read CONTRIBUTING.md for details on our code of conduct, and the process for submitting pull requests to us.

## License
This project is licensed under the MIT License - see the LICENSE.md file for details

## Acknowledgments
Thanks to the creators of the used libraries and frameworks.