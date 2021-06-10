A template file contains the Ensoniq Mirage 3.2 OS. Wavsyn writes 8 bit audio data into the sounds 
(lower 1,2,3, upper 1,2,3). Data should be written in KB chunks (1, 2, 4, 8, 16, etc. up to 64KB).
64KB is the maximum size for the audio data for a sound. There are 6 sounds, making 384KB of audio
in total.

Templates also have some pre-defined wavesamples and programs set up. However, since you don't know 
in advance exactly how the template is being used, it is just a guess at programs that may work.