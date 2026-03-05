FROM emscripten/emsdk:3.1.15 as build

ARG FFMPEG_VERSION=4.3.1
ARG PREFIX=/opt/ffmpeg
ARG MAKEFLAGS="-j4"

RUN apt-get update && apt-get install -y autoconf libtool build-essential

# Get ffmpeg source.
# Note: We don't need libx264 or libmp3lame for metadata extraction (probe only)
RUN cd /tmp/ && \
  wget http://ffmpeg.org/releases/ffmpeg-${FFMPEG_VERSION}.tar.gz && \
  tar zxf ffmpeg-${FFMPEG_VERSION}.tar.gz && rm ffmpeg-${FFMPEG_VERSION}.tar.gz

ARG CFLAGS="-O3"
ARG LDFLAGS="-s INITIAL_MEMORY=33554432"

# Compile ffmpeg.
# For metadata extraction only, we don't need encoding libraries (libx264, libmp3lame)
RUN cd /tmp/ffmpeg-${FFMPEG_VERSION} && \
  emconfigure ./configure \
  --prefix=${PREFIX} \
  --target-os=none \
  --arch=x86_32 \
  --enable-cross-compile \
  --disable-debug \
  --disable-x86asm \
  --disable-inline-asm \
  --disable-stripping \
  --disable-programs \
  --disable-doc \
  --disable-all \
  --enable-avcodec \
  --enable-avformat \
  --enable-avutil \
  --enable-swresample \
  --enable-swscale \
  --enable-protocol=file \
  --enable-decoder=h264,aac,pcm_s16le,mp3 \
  --enable-demuxer=mov,matroska,mp3 \
  --extra-cflags="$CFLAGS" \
  --extra-cxxflags="$CFLAGS" \
  --extra-ldflags="$LDFLAGS" \
  --nm="llvm-nm -g" \
  --ar=emar \
  --as=llvm-as \
  --ranlib=llvm-ranlib \
  --cc=emcc \
  --cxx=em++ \
  --objcc=emcc \
  --dep-cc=emcc

RUN cd /tmp/ffmpeg-${FFMPEG_VERSION} && \
  emmake make -j4 && \
  emmake make install


COPY ./src/ffprobe-wasm-wrapper.cpp /build/src/ffprobe-wasm-wrapper.cpp
COPY ./Makefile /build/Makefile

WORKDIR /build

RUN make
