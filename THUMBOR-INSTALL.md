Guide

- install docker desktop for windows (https://docs.docker.com/docker-for-windows/install/)
- pull docker image (https://github.com/MinimalCompact/thumbor) => docker pull minimalcompact/thumbor

Programmatic approach

- run the container => docker run -p 8888:80 --name ril-thumbor --rm --mount type=bind,source="\$(pwd)",target=/data/loader,readonly minimalcompact/thumbor
- add "-e" options to overwrite thumbor configuration and support our usage -> use envfile

- when finished, stop the container (due to --rm it should automatically cleanup the virtual filesystem) => docker container stop ril-thumbor

Interesing notes

- detaching: https://stackoverflow.com/questions/35767918/node-js-how-to-spawn-detached-child-in-foreground-and-exit
- run API: https://docs.docker.com/engine/reference/run/

Unresolved problems

- error out if docker isn't installed
- check if container and thumbor are up and running
- how to consistently and PROGRAMMATICALLY map the projects temp folders in a folder inside the docker instance? Use mount

Future dev

- use multi processes?

`docker run -p 8888:80 --name ril-thumbor --env-file ./node_modules/@dreamonkey/responsive-image-loader/dist/src/transformers/thumbor-docker/.thumbor-env --mount type=bind,source="$(pwd)",target=/app/loader,readonly --rm minimalcompact/thumbor`

`http://localhost:8888/unsafe/500x150/src/assets/images/backup-system.jpg`
