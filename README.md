Wavsyn
=================
This is an Electron app. It is a port of proof of concept python code (from my MirageDiskTools project) for creating disk images for the Ensoniq Mirage.
---
Now what is it really? This app is a very generic batch processor. It follows the simplest software abstraction there is:
`input - process - output`

1. Input - a directory of files to process
2. Process - the code to run
3. Output - a directory to write output to

If arguments are needed, they are passed in as a JSON string so Wavsyn knows nothing about them. Arguments are described by help text associated with each function.