# ADR-002: UART dan library PZEM004Tv30

## Status
Accepted

## Context
Aplikasi membutuhkan cara terpelihara untuk membaca PZEM-004T tanpa mengimplementasikan protokol perangkat secara manual.

## Decision
ESP32 membaca data PZEM-004T V3.0 melalui antarmuka serial UART menggunakan library PZEM004Tv30. Library menangani protokol internal perangkat. Pin, serial port, timeout, dan error policy menjadi konfigurasi firmware.

## Alternatives
Implementasi protokol manual; SoftwareSerial; meter dengan transport lain.

## Consequences
Dependency firmware bertambah dan konflik UART harus diuji. Dokumentasi tidak boleh menyatakan aplikasi mengimplementasikan Modbus manual atau bahwa perangkat sama sekali tidak menggunakan protokol internal tersebut.
