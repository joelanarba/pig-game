from machine import Pin, PWM, time_pulse_us
from time import sleep, ticks_ms

# ---------------- PIN SETUP ----------------
pir = Pin(13, Pin.IN)

trig = Pin(5, Pin.OUT)
echo = Pin(18, Pin.IN)

button = Pin(19, Pin.IN, Pin.PULL_UP)

red = Pin(25, Pin.OUT)
green = Pin(26, Pin.OUT)
blue = Pin(27, Pin.OUT)

buzzer = PWM(Pin(21))
buzzer.freq(1000)
buzzer.duty(0)

# ---------------- VARIABLES ----------------
system_armed = False
last_button = 1

DISTANCE_THRESHOLD = 50   # cm
ALARM_DURATION = 5        # seconds

# ---------------- FUNCTIONS ----------------
def set_rgb(r, g, b):
    red.value(r)
    green.value(g)
    blue.value(b)

def beep(on=True):
    buzzer.duty(512 if on else 0)

def get_distance():
    trig.off()
    sleep(0.002)
    trig.on()
    sleep(0.00001)
    trig.off()

    duration = time_pulse_us(echo, 1, 30000)
    if duration < 0:
        return None

    distance = (duration * 0.034) / 2
    return distance

# ---------------- INITIAL STATE ----------------
set_rgb(0, 1, 0)  # Green = Disarmed
print("Intrusion Detection & Alert System Started")

# ---------------- MAIN LOOP ----------------
while True:

    # -------- BUTTON: ARM / DISARM --------
    btn = button.value()
    if last_button == 1 and btn == 0:
        system_armed = not system_armed

        if system_armed:
            print("System ARMED")
            set_rgb(0, 0, 1)  # Blue
        else:
            print("System DISARMED")
            set_rgb(0, 1, 0)  # Green
            beep(False)

        sleep(0.3)  # debounce

    last_button = btn

    # -------- INTRUSION DETECTION --------
    if system_armed and pir.value() == 1:
        distance = get_distance()

        if distance is not None and distance < DISTANCE_THRESHOLD:
            print("INTRUSION CONFIRMED!")
            print("Distance:", distance, "cm")

            set_rgb(1, 0, 0)  # Red
            beep(True)

            sleep(ALARM_DURATION)

            beep(False)
            set_rgb(0, 0, 1)  # Back to armed

        else:
            print("Motion detected but no close object")

    sleep(0.1)