package com.acc

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class AccApplication

fun main(args: Array<String>) {
    runApplication<AccApplication>(*args)
}
