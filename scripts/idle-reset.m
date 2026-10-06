#import <ApplicationServices/ApplicationServices.h>
#include <unistd.h>
#include <string.h>

int main(int argc, const char *argv[]) {
    CGEventSourceRef source = CGEventSourceCreate(kCGEventSourceStateCombinedSessionState);
    CGEventRef current = CGEventCreate(NULL);
    CGPoint location = current ? CGEventGetLocation(current) : CGPointMake(0, 0);

    if (argc > 1 && strcmp(argv[1], "--static") == 0) {
        CGEventRef event = CGEventCreateMouseEvent(source, kCGEventMouseMoved, location, kCGMouseButtonLeft);
        int success = event != NULL;
        if (event) {
            CGEventPost(kCGHIDEventTap, event);
            CFRelease(event);
        }
        if (current) CFRelease(current);
        if (source) CFRelease(source);
        return success ? 0 : 1;
    }
    const int steps = 30;
    const double distance = 10.0;
    const useconds_t stepDuration = 10000;
    int posted = 0;

    for (int step = 1; step <= steps; step++) {
        double progress = (double)step / (double)steps;
        double direction = progress <= 0.5 ? progress * 2.0 : (1.0 - progress) * 2.0;
        CGPoint nextLocation = CGPointMake(location.x + distance * direction, location.y);
        CGEventRef event = CGEventCreateMouseEvent(source, kCGEventMouseMoved, nextLocation, kCGMouseButtonLeft);
        if (event) {
            CGWarpMouseCursorPosition(nextLocation);
            CGEventPost(kCGHIDEventTap, event);
            CFRelease(event);
            posted++;
        }
        usleep(stepDuration);
    }

    if (current) CFRelease(current);
    if (source) CFRelease(source);
    return posted == steps ? 0 : 1;
}
