/* eslint-disable */

import React, { useState, useEffect } from "react";
import {
  GoogleMap,
  Polyline,
  Marker,
  TransitLayer,
} from "@react-google-maps/api";
import { TailSpin } from "react-loader-spinner";
import { IoCloseSharp } from "react-icons/io5";
import { FaDirections } from "react-icons/fa";

const containerStyles = {
  width: "100vw",
  height: "100vh",
};

const Map = () => {
  const [origin, setOrigin] = useState("");
  const [currentPosition, setCurrentPosition] = useState({
    lat: -1.939826787816454,
    lng: 30.0445426438232,
  });
  const [destination, setDestination] = useState("Kimironko");
  const [destinationCoordinates, setDestinationCoordinates] = useState(null);
  const [polylinePath, setPolylinePath] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [markers, setMarkers] = useState([]);
  const [routeInfo, setRouteInfo] = useState(false); // New state for route information
  const [showRouteInfo, setShowRouteInfo] = useState(false); // New state for controlling the visibility of the dropdown
  const [simulationStarted, setSimulationStarted] = useState(false);
  const [carPositionIndex, setCarPositionIndex] = useState(0);
  const [remainingDistance, setRemainingDistance] = useState(0);
  const [remainingDuration, setRemainingDuration] = useState(0);
  const [end, setEnd] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPosition((prevPosition) => ({
        lat: prevPosition.lat + Math.random() * 0.1 - 0.05,
        lng: prevPosition.lng + Math.random() * 0.1 - 0.05,
      }));
    }, 1000000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Fetch the name of the current position based on its coordinates
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: currentPosition }, (results, status) => {
      if (status === "OK") {
        if (results[0]) {
          setOrigin(results[0].formatted_address);
        } else {
          console.error("No results found");
        }
      } else {
        console.error("Geocoder failed due to: " + status);
      }
    });
  }, [currentPosition]);

  useEffect(() => {
    if (simulationStarted && carPositionIndex < polylinePath.length - 1) {
      const timeout = setTimeout(() => {
        setCarPositionIndex((prevIndex) => prevIndex + 1);
      }, 1000); // Adjust the speed of simulation by changing the timeout duration
      return () => clearTimeout(timeout);
    }
  }, [simulationStarted, carPositionIndex, polylinePath]);

  // Handle change in destination input
  const handleDestinationChange = (event) => {
    setDestination(event.target.value);
  };
  const handleOriginChange = (event) => {
    const originValue = event.target.value;
    setOrigin(originValue);
  };

  const handleShowRoute = () => {
    if (destination.trim() !== "") {
      setIsLoading(true);
      // Fetch the coordinates of the entered origin using geocoding
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: origin }, (results, status) => {
        if (status === "OK" && results[0]) {
          const location = results[0].geometry.location;
          setCurrentPosition({ lat: location.lat(), lng: location.lng() });
        } else {
          console.error(
            "Geocode was not successful for the following reason:",
            status
          );
        }
      });
      // Fetch coordinates of the destination using geocoding
      geocoder.geocode({ address: destination }, (results, status) => {
        if (status === "OK" && results[0]) {
          const location = results[0].geometry.location;

          setEnd({
            lat: location.lat(),
            lng: location.lng(),
          });
        } else {
          console.error(
            "Geocode was not successful for the following reason:",
            status
          );
        }
      });
      // Fetch route from current position to destination using Directions API
      const directionsService = new window.google.maps.DirectionsService();
      let request = {
        origin: currentPosition,
        destination: destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      };

      if (destination === "Kimironko") {
        // Include waypoints only if the destination is "Kimironko"
        const waypoints = [
          { location: { lat: -1.9355377074007851, lng: 30.060163829002217 } }, // Stop A
          { location: { lat: -1.9358808342336546, lng: 30.08024820994666 } }, // Stop B
          { location: { lat: -1.9489196023037583, lng: 30.092607828989397 } }, // Stop C
          { location: { lat: -1.9592132952818164, lng: 30.106684061788073 } }, // Stop D
          { location: { lat: -1.9487480402200394, lng: 30.126596781356923 } }, // Stop E
        ];

        // Display waypoints as markers
        const waypointMarkers = waypoints.map((waypoint, index) => ({
          position: {
            lat: waypoint.location.lat,
            lng: waypoint.location.lng,
          },
          label: String.fromCharCode(65 + index), // Label markers with letters A, B, C, ...
          title: `Stop ${String.fromCharCode(65 + index)}`,
        }));

        setMarkers(waypointMarkers);

        request = {
          ...request,
          waypoints: waypoints.map((waypoint) => ({
            location: new window.google.maps.LatLng(
              waypoint.location.lat,
              waypoint.location.lng
            ),
          })),
          optimizeWaypoints: true, // Optimize the order of waypoints
        };
      }

      directionsService.route(request, (response, status) => {
        setIsLoading(false);
        if (status === window.google.maps.DirectionsStatus.OK) {
          // Extract route details
          const route = response.routes[0];
          const legs = route.legs[0]; // Assuming there's only one leg

          // Extract distance and duration
          setRouteInfo({
            distance: legs.distance.text,
            duration: legs.duration.text,
          });
          setRemainingDistance(legs.distance.text);
          setRemainingDuration(legs.duration.text);

          // Extract steps (stops) along the route
          let steps = legs.steps.map((step, index) => ({
            instruction: step.instructions,
            distance: step.distance.text,
            duration: step.duration.text,
            location: step.end_location,
          }));

          // Calculate distance of each step's start location to the origin
          steps = steps.map((step, index) => {
            if (index === 0) {
              return step;
            }
            const distanceToOrigin =
              window.google.maps.geometry.spherical.computeDistanceBetween(
                new window.google.maps.LatLng(
                  step.location.lat(),
                  step.location.lng()
                ),
                new window.google.maps.LatLng(
                  currentPosition.lat,
                  currentPosition.lng
                )
              );
            return {
              ...step,
              distanceToOrigin: distanceToOrigin,
            };
          });

          // Sort steps based on distance to the origin
          steps.sort((a, b) => a.distanceToOrigin - b.distanceToOrigin);

          // Display route on the map
          const path = route.overview_path.map((point) => ({
            lat: point.lat(),
            lng: point.lng(),
          }));
          if (destination !== "Kimironko") {
            // Add markers to each step with the number of the step
            const markers = legs.steps.map((step, index) => ({
              position: {
                lat: step.end_location.lat(),
                lng: step.end_location.lng(),
              },
              label: `${index + 1}`,
            }));
            setMarkers(markers);
          }

          setPolylinePath(path);
          setShowRouteInfo(true);
        } else {
          console.error("Error fetching route:", status);
        }
      });
    }
  };

  // Update polyline path when destination coordinates change
  useEffect(() => {
    if (destinationCoordinates) {
      // Calculate the path between current position and destination
      const path = [currentPosition, destinationCoordinates];
      setPolylinePath(path);
    } else {
      // If destination coordinates are not available, just include the current position
      setPolylinePath([currentPosition]);
    }
  }, [currentPosition, destinationCoordinates]);

  useEffect(() => {
    const inputElement = document.getElementById("input");
    const autocomplete = new window.google.maps.places.Autocomplete(
      inputElement,
      { types: ["geocode"] }
    );

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry || !place.geometry.location) {
        console.error("No details available for input:", place.name);
        return;
      }
      setDestination(place.formatted_address || "");
      setDestinationCoordinates({
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      });
    });
  }, [destination]);
  useEffect(() => {
    const inputElement = document.getElementById("origin-input");
    const autocomplete = new window.google.maps.places.Autocomplete(
      inputElement,
      { types: ["geocode"] }
    );

    autocomplete.addListener("place_changed", () => {
      currentPosition;
      const place = autocomplete.getPlace();
      if (!place.geometry || !place.geometry.location) {
        console.error("No details available for input:", place.name);
        return;
      }
      setOrigin(place.formatted_address || "");
      setCurrentPosition({
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      });
    });
  }, []);

  const handleRemoveRoute = () => {
    setPolylinePath([currentPosition]);
    setMarkers([]);
    setRouteInfo(null);
    setShowRouteInfo(false);
    setCarPositionIndex(0);
  };

  const handleStartSimulation = () => {
    setSimulationStarted(true);

    // Calculate remaining distance and duration
    if (polylinePath.length > carPositionIndex + 1) {
      const remainingPath = polylinePath.slice(carPositionIndex + 1);
      const remainingDistance =
        window.google.maps.geometry.spherical.computeLength(
          remainingPath.map(
            (point) => new window.google.maps.LatLng(point.lat, point.lng)
          )
        );
      const remainingDuration = remainingDistance / 20; // Assuming average speed of 20 m/s
      setRemainingDistance(remainingDistance.toFixed(2) + " meters");
      setRemainingDuration(remainingDuration.toFixed(2) + " seconds");
    } else {
      setRemainingDistance("0 meters");
      setRemainingDuration("0 seconds");
    }
  };

  useEffect(() => {
    if (simulationStarted && carPositionIndex >= polylinePath.length - 1) {
      // Car has reached the final point, reset its position
      setCarPositionIndex(0);
      setSimulationStarted(false); // Stop the simulation
    }
  }, [simulationStarted, carPositionIndex, polylinePath]);

  useEffect(() => {
    // Reset remaining distance and duration when the simulation is stopped
    if (!simulationStarted) {
      setRemainingDistance(routeInfo.distance);
      setRemainingDuration(routeInfo.duration);
    }
  }, [simulationStarted]);

  useEffect(() => {
    // Calculate remaining distance in kilometers
    if (polylinePath.length > carPositionIndex + 1) {
      const remainingPath = polylinePath.slice(carPositionIndex + 1);
      const remainingDistance =
        window.google.maps.geometry.spherical.computeLength(
          remainingPath.map(
            (point) => new window.google.maps.LatLng(point.lat, point.lng)
          )
        );
      const remainingDistanceKm = remainingDistance / 1000; // Convert meters to kilometers
      setRemainingDistance(remainingDistanceKm.toFixed(2) + " km");
    } else {
      setRemainingDistance("0 km");
    }

    // Calculate remaining duration in hours and minutes
    if (polylinePath.length > carPositionIndex + 1) {
      const remainingPath = polylinePath.slice(carPositionIndex + 1);
      const remainingDistance =
        window.google.maps.geometry.spherical.computeLength(
          remainingPath.map(
            (point) => new window.google.maps.LatLng(point.lat, point.lng)
          )
        );
      const remainingDuration = remainingDistance / (20 * 3600); // Convert speed to kilometers per hour
      const hours = Math.floor(remainingDuration);
      const minutes = Math.round((remainingDuration - hours) * 60);
      setRemainingDuration(`${hours} hr ${minutes} min`);
    } else {
      setRemainingDuration("0 hr 0 min");
    }
  }, [carPositionIndex, polylinePath]);

  return (
    <div>
      <div>
        <GoogleMap
          mapContainerStyle={containerStyles}
          center={currentPosition}
          zoom={13}
          options={{ mapTypeControl: false }}
        >
          <TransitLayer />

          <div className="flex gap-2 absolute top-4 left-10 h-12">
            <input
              id="origin-input"
              type="text"
              placeholder="Enter Origin"
              value={origin}
              onChange={handleOriginChange}
              autoComplete="off"
              className="bg-white text-black rounded-2xl px-2 border-none"
            />
            <input
              id="input"
              type="text"
              placeholder="Enter destination"
              value={destination}
              onChange={handleDestinationChange}
              autoComplete="off"
              className="bg-white text-black rounded-2xl px-2 border-none"
            />
            <div
              onClick={handleShowRoute}
              className=" bg-white flex items-center justify-center  cursor-pointer w-12 rounded-3xl"
              disabled={isLoading}
            >
              {isLoading ? (
                <TailSpin color="#0000ff" height={20} width={20} />
              ) : (
                <FaDirections color="#0000ff" title="Show route" size={20} />
              )}
            </div>
          </div>
          {/* Draw polyline after the user had inserted the destination */}
          {polylinePath.length > 0 && (
            <>
              <Polyline
                path={polylinePath}
                options={{
                  strokeColor: "#0000ff",
                  strokeWeight: 6,
                  geodesic: true,
                }}
              />
              {/* Display the user location by the use of a marker */}
              <Marker position={currentPosition} title="Your location" />
              {markers.map((marker, index) => {
                return (
                  <Marker
                    key={index}
                    position={marker.position}
                    label={marker.label}
                    title="stop"
                  />
                );
              })}
              {destination ? (
                <Marker
                  position={end}
                  title={destination}
                  label={destination}
                />
              ) : null}
              {console.log(destinationCoordinates)}

              {simulationStarted && (
                <Marker
                  position={polylinePath[carPositionIndex]}
                  icon={{
                    url: "../../public/car-icon.png",
                    scaledSize: new window.google.maps.Size(60, 30),
                  }}
                />
              )}
            </>
          )}
        </GoogleMap>
      </div>
      {/* Dropdown for route information */}
      {showRouteInfo && (
        <div className="dropdown absolute bottom-2 p-4 rounded-xl left-10  bg-white w-80">
          <div>
            <strong>Distance:</strong> {remainingDistance}
          </div>
          <div>
            <strong>Duration:</strong> {remainingDuration}
          </div>
          <button
            className="mt-4 bg-blue-500 text-white p-2 rounded-md"
            onClick={handleStartSimulation}
          >
            Start Similation
          </button>
          <IoCloseSharp
            className="absolute top-4 right-4 cursor-pointer"
            onClick={handleRemoveRoute}
          />
        </div>
      )}
    </div>
  );
};

export default Map;
