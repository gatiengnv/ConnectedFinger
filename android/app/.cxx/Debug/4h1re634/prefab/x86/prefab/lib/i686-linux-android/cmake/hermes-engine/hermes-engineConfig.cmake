if(NOT TARGET hermes-engine::hermesvm)
add_library(hermes-engine::hermesvm SHARED IMPORTED)
set_target_properties(hermes-engine::hermesvm PROPERTIES
    IMPORTED_LOCATION "/Users/gatiengenevois/.gradle/caches/8.13/transforms/be85aa0528c57bc2df8aa4e210f3a0ae/transformed/hermes-android-0.82.0-debug/prefab/modules/hermesvm/libs/android.x86/libhermesvm.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/gatiengenevois/.gradle/caches/8.13/transforms/be85aa0528c57bc2df8aa4e210f3a0ae/transformed/hermes-android-0.82.0-debug/prefab/modules/hermesvm/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

